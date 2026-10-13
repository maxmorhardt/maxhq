package messaging

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type publishCall struct {
	subject string
	payload string
}

type fakePublisher struct {
	calls  []publishCall
	failAt int
}

func (f *fakePublisher) Publish(_ context.Context, subject string, payload []byte, _ ...jetstream.PublishOpt) (*jetstream.PubAck, error) {
	if f.failAt > 0 && len(f.calls)+1 == f.failAt {
		return nil, errors.New("jetstream unavailable")
	}
	f.calls = append(f.calls, publishCall{subject: subject, payload: string(payload)})
	return &jetstream.PubAck{}, nil
}

func outboxRows(n int) *sqlmock.Rows {
	rows := sqlmock.NewRows([]string{"id", "seq", "subject", "payload", "created_at", "published_at"})
	for i := range n {
		rows.AddRow(uuid.New(), i+1, "squares.test", []byte(`{"n":1}`), time.Now(), nil)
	}
	return rows
}

func expectLock(mock sqlmock.Sqlmock, locked bool) {
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnRows(sqlmock.NewRows([]string{"locked"}).AddRow(locked))
}

func TestRelay_PublishesInOrderAndMarksPublished(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox" WHERE published_at IS NULL ORDER BY seq ASC`).WillReturnRows(outboxRows(2))
	mock.ExpectExec(`UPDATE "outbox" SET "published_at"`).WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	pub := &fakePublisher{}
	published, more, err := NewRelay(db, pub, 1).publishBatch(context.Background())

	require.NoError(t, err)
	assert.Equal(t, 2, published)
	assert.False(t, more)
	assert.Len(t, pub.calls, 2)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_SkipsWhenAnotherReplicaHoldsTheLock(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, false)
	mock.ExpectCommit()

	pub := &fakePublisher{}
	published, more, err := NewRelay(db, pub, 1).publishBatch(context.Background())

	require.NoError(t, err)
	assert.Zero(t, published)
	assert.False(t, more)
	assert.Empty(t, pub.calls)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_StopsAtFirstPublishFailureAndKeepsEarlierProgress(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows(3))
	mock.ExpectExec(`UPDATE "outbox" SET "published_at"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	published, more, err := NewRelay(db, &fakePublisher{failAt: 2}, 1).publishBatch(context.Background())

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

	_, _, err := NewRelay(db, &fakePublisher{}, 1).publishBatch(context.Background())

	assert.ErrorIs(t, err, assert.AnError)
}

func TestRelay_FlushLoopsWhileBatchesAreFull(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows(relayBatchSize))
	mock.ExpectExec(`UPDATE "outbox"`).WillReturnResult(sqlmock.NewResult(0, relayBatchSize))
	mock.ExpectCommit()
	mock.ExpectBegin()
	expectLock(mock, true)
	mock.ExpectQuery(`SELECT \* FROM "outbox"`).WillReturnRows(outboxRows(0))
	mock.ExpectCommit()

	pub := &fakePublisher{}
	NewRelay(db, pub, 1).Flush(context.Background())

	assert.Len(t, pub.calls, relayBatchSize)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_FlushStopsOnError(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnError(assert.AnError)
	mock.ExpectRollback()

	NewRelay(db, &fakePublisher{}, 1).Flush(context.Background())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_NotifyNeverBlocks(t *testing.T) {
	db, _ := newMockDB(t)
	r := NewRelay(db, &fakePublisher{}, 1)

	r.Notify()
	r.Notify()

	assert.Len(t, r.wake, 1)
}

func TestRelay_RecordBacklogAndCleanup(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT COUNT\(\*\) AS pending, MIN\(created_at\) AS oldest FROM "outbox"`).
		WillReturnRows(sqlmock.NewRows([]string{"pending", "oldest"}).AddRow(3, time.Now().Add(-time.Minute)))
	mock.ExpectExec(`DELETE FROM "outbox" WHERE published_at <`).WillReturnResult(sqlmock.NewResult(0, 4))

	r := NewRelay(db, &fakePublisher{}, 1)
	r.recordBacklog(context.Background())
	r.cleanup(context.Background())

	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_RecordBacklogAndCleanupTolerateErrors(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT COUNT`).WillReturnError(assert.AnError)
	mock.ExpectExec(`DELETE FROM "outbox"`).WillReturnError(assert.AnError)

	r := NewRelay(db, &fakePublisher{}, 1)
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

	r := NewRelay(db, &fakePublisher{}, 1)
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
