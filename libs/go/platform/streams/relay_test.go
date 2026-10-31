package streams

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return mr, client
}

func outboxRows(ids ...uuid.UUID) *sqlmock.Rows {
	rows := sqlmock.NewRows([]string{"id", "seq", "stream", "type", "payload", "request_id", "created_at", "published_at"})
	for i, id := range ids {
		rows.AddRow(id, i+1, "test", "thing.updated", []byte(`{"n":1}`), "req-"+id.String(), time.Now(), nil)
	}
	return rows
}

func newIDs(n int) []uuid.UUID {
	ids := make([]uuid.UUID, n)
	for i := range ids {
		ids[i] = uuid.New()
	}
	return ids
}

func expectLock(mock sqlmock.Sqlmock, locked bool) {
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(locked))
}

func streamLen(t *testing.T, client *redis.Client, name string) int64 {
	t.Helper()
	n, err := client.XLen(context.Background(), Key(name)).Result()
	require.NoError(t, err)
	return n
}

func TestRelay_PublishesInOrderAndMarksPublished(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	ids := newIDs(2)
	mock.ExpectQuery(`SELECT \* FROM "outbox" WHERE published_at IS NULL ORDER BY seq ASC`).WillReturnRows(outboxRows(ids...))
	mock.ExpectExec(`UPDATE "outbox" SET "published_at"`).WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	_, client := newRedis(t)
	published, more, err := NewRelay(db, client, 1, time.Hour).publishBatch(context.Background())

	require.NoError(t, err)
	assert.Equal(t, 2, published)
	assert.False(t, more)
	assert.NoError(t, mock.ExpectationsWereMet())

	entries, err := Range(context.Background(), client, "test", "", 10)
	require.NoError(t, err)
	require.Len(t, entries, 2)
	assert.Equal(t, "thing.updated", entries[0].Type)
	assert.JSONEq(t, `{"n":1}`, string(entries[0].Data))
	assert.Equal(t, ids[0].String(), entries[0].EventID)
	assert.Equal(t, ids[1].String(), entries[1].EventID)
	assert.Equal(t, "req-"+ids[0].String(), entries[0].RequestID)

	ttl, err := client.PTTL(context.Background(), Key("test")).Result()
	require.NoError(t, err)
	assert.Positive(t, ttl, "streams expire once they stop receiving events")
}

func TestRelay_RetriedEventIsNotAppendedTwice(t *testing.T) {
	_, client := newRedis(t)
	db, _ := newMockDB(t)
	r := NewRelay(db, client, 1, time.Hour)
	event := &OutboxEvent{ID: uuid.New(), Stream: "test", Type: "thing.updated", Payload: []byte(`{}`)}

	require.NoError(t, r.appendEvent(context.Background(), event))
	require.NoError(t, r.appendEvent(context.Background(), event))

	assert.Equal(t, int64(1), streamLen(t, client, "test"))
}

func TestRelay_SkipsWhenAnotherReplicaHoldsTheLock(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, false)
	mock.ExpectCommit()

	_, client := newRedis(t)
	published, more, err := NewRelay(db, client, 1, time.Hour).publishBatch(context.Background())

	require.NoError(t, err)
	assert.Zero(t, published)
	assert.False(t, more)
	assert.Zero(t, streamLen(t, client, "test"))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_StopsAtFirstPublishFailureAndKeepsEarlierProgress(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	ids := newIDs(3)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows(ids...))
	mock.ExpectExec(`UPDATE "outbox" SET "published_at"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	mr, client := newRedis(t)
	mr.HSet("app:outbox:"+ids[1].String(), "x", "y")
	published, more, err := NewRelay(db, client, 1, time.Hour).publishBatch(context.Background())

	assert.Error(t, err)
	assert.Equal(t, 1, published)
	assert.False(t, more)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_ReportsLockQueryFailure(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnError(assert.AnError)
	mock.ExpectRollback()

	_, client := newRedis(t)
	_, _, err := NewRelay(db, client, 1, time.Hour).publishBatch(context.Background())

	assert.ErrorIs(t, err, assert.AnError)
}

func TestRelay_FlushLoopsWhileBatchesAreFull(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows(newIDs(relayBatchSize)...))
	mock.ExpectExec(`UPDATE "outbox"`).WillReturnResult(sqlmock.NewResult(0, relayBatchSize))
	mock.ExpectCommit()
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows())
	mock.ExpectCommit()

	_, client := newRedis(t)
	NewRelay(db, client, 1, time.Hour).Flush(context.Background())

	assert.Equal(t, int64(relayBatchSize), streamLen(t, client, "test"))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_FlushStopsOnError(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnError(assert.AnError)
	mock.ExpectRollback()

	NewRelay(db, nil, 1, time.Hour).Flush(context.Background())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_NotifyNeverBlocks(t *testing.T) {
	db, _ := newMockDB(t)
	r := NewRelay(db, nil, 1, time.Hour)

	r.Notify()
	r.Notify()

	assert.Len(t, r.wake, 1)
}

func TestRelay_RecordBacklogAndCleanup(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT COUNT\(\*\) AS pending, MIN\(created_at\) AS oldest FROM "outbox"`).
		WillReturnRows(sqlmock.NewRows([]string{"pending", "oldest"}).AddRow(3, time.Now().Add(-time.Minute)))
	mock.ExpectExec(`DELETE FROM "outbox" WHERE published_at <`).WillReturnResult(sqlmock.NewResult(0, 4))

	r := NewRelay(db, nil, 1, time.Hour)
	r.recordBacklog(context.Background())
	r.cleanup(context.Background())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_RecordBacklogAndCleanupTolerateErrors(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT COUNT`).WillReturnError(assert.AnError)
	mock.ExpectExec(`DELETE FROM "outbox"`).WillReturnError(assert.AnError)

	r := NewRelay(db, nil, 1, time.Hour)
	r.recordBacklog(context.Background())
	r.cleanup(context.Background())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_RunDrainsThenStopsOnCancel(t *testing.T) {
	db, mock := newMockDB(t)
	for range 2 {
		mock.ExpectBegin()
		expectLock(mock, false)
		mock.ExpectCommit()
	}

	r := NewRelay(db, nil, 1, time.Hour)
	r.interval = time.Hour
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		r.Run(ctx)
		close(done)
	}()

	r.Notify()
	require.Eventually(t, func() bool { return mock.ExpectationsWereMet() == nil }, 2*time.Second, 10*time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("relay did not stop")
	}
}
