package streams

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testSpec = ConsumerSpec{Name: "test-consumer", Stream: "s", LockKey: 7}

func expectOffset(mock sqlmock.Sqlmock, lastID string) {
	rows := sqlmock.NewRows([]string{"consumer", "last_id", "updated_at"})
	if lastID != "" {
		rows.AddRow(testSpec.Name, lastID, time.Now())
	}
	mock.ExpectQuery(`SELECT \* FROM "stream_offsets" WHERE consumer = \$1 LIMIT \$2`).WithArgs(testSpec.Name, 1).WillReturnRows(rows)
}

type recorder struct {
	mu     sync.Mutex
	seen   []string
	failOn string
}

func (r *recorder) handle(_ context.Context, e Entry) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if e.ID == r.failOn {
		return errors.New("boom")
	}
	r.seen = append(r.seen, e.ID)
	return nil
}

func (r *recorder) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.seen)
}

func TestConsumer_HandlesFromTheStartAndSavesThePosition(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", "{}")
	add(t, client, "s", "2-0", "a", "{}")

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "")
	mock.ExpectExec(`INSERT INTO "stream_offsets" .* ON CONFLICT \("consumer"\) DO UPDATE SET "last_id"="excluded"."last_id"`).
		WithArgs(testSpec.Name, "2-0", sqlmock.AnyArg()).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	rec := &recorder{}
	res, err := NewConsumer(db, client, testSpec, rec.handle).processBatch(context.Background())

	require.NoError(t, err)
	assert.True(t, res.locked)
	assert.Equal(t, 2, res.handled)
	assert.Equal(t, "2-0", res.offset)
	assert.Equal(t, []string{"1-0", "2-0"}, rec.seen)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConsumer_ResumesAfterTheSavedPosition(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", "{}")
	add(t, client, "s", "2-0", "a", "{}")

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "1-0")
	mock.ExpectExec(`INSERT INTO "stream_offsets"`).WithArgs(testSpec.Name, "2-0", sqlmock.AnyArg()).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	rec := &recorder{}
	_, err := NewConsumer(db, client, testSpec, rec.handle).processBatch(context.Background())

	require.NoError(t, err)
	assert.Equal(t, []string{"2-0"}, rec.seen)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConsumer_StopsAtAFailingEntryAndKeepsEarlierProgress(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", "{}")
	add(t, client, "s", "2-0", "a", "{}")
	add(t, client, "s", "3-0", "a", "{}")

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "")
	mock.ExpectExec(`INSERT INTO "stream_offsets"`).WithArgs(testSpec.Name, "1-0", sqlmock.AnyArg()).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	rec := &recorder{failOn: "2-0"}
	res, err := NewConsumer(db, client, testSpec, rec.handle).processBatch(context.Background())

	require.Error(t, err)
	assert.Contains(t, err.Error(), "2-0")
	assert.Equal(t, 1, res.handled)
	assert.Equal(t, []string{"1-0"}, rec.seen, "nothing after the failing entry runs")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConsumer_DoesNothingWithoutTheLock(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", "{}")

	mock.ExpectBegin()
	expectLock(mock, false)
	mock.ExpectCommit()

	rec := &recorder{}
	res, err := NewConsumer(db, client, testSpec, rec.handle).processBatch(context.Background())

	require.NoError(t, err)
	assert.False(t, res.locked)
	assert.Empty(t, rec.seen)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConsumer_NothingNewWritesNothing(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", "{}")

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "1-0")
	mock.ExpectCommit()

	res, err := NewConsumer(db, client, testSpec, (&recorder{}).handle).processBatch(context.Background())

	require.NoError(t, err)
	assert.Zero(t, res.handled)
	assert.Equal(t, "1-0", res.offset)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConsumer_ReportsLockFailure(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`pg_try_advisory_xact_lock`).WillReturnError(assert.AnError)
	mock.ExpectRollback()

	_, err := NewConsumer(db, client, testSpec, (&recorder{}).handle).processBatch(context.Background())

	assert.ErrorIs(t, err, assert.AnError)
}

func TestConsumer_ReportsRedisFailure(t *testing.T) {
	db, mock := newMockDB(t)
	mr, client := newRedis(t)
	mr.Close()

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "")
	mock.ExpectRollback()

	_, err := NewConsumer(db, client, testSpec, (&recorder{}).handle).processBatch(context.Background())

	assert.ErrorContains(t, err, "failed to read stream")
}

func TestConsumer_RunHandlesNewEntriesThenStops(t *testing.T) {
	db, mock := newMockDB(t)
	_, client := newRedis(t)

	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "")
	mock.ExpectCommit()
	mock.ExpectBegin()
	expectLock(mock, true)
	expectOffset(mock, "")
	mock.ExpectExec(`INSERT INTO "stream_offsets"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	for range 20 {
		mock.ExpectBegin()
		expectLock(mock, true)
		expectOffset(mock, "1-0")
		mock.ExpectCommit()
	}

	rec := &recorder{}
	c := NewConsumer(db, client, testSpec, rec.handle)
	c.block = 50 * time.Millisecond
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		c.Run(ctx)
		close(done)
	}()

	time.Sleep(20 * time.Millisecond)
	add(t, client, "s", "1-0", "a", "{}")
	require.Eventually(t, func() bool { return rec.count() == 1 }, 2*time.Second, 10*time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("consumer did not stop")
	}
}

func TestRetryDelay(t *testing.T) {
	assert.Equal(t, time.Second, retryDelay(1))
	assert.Equal(t, 4*time.Second, retryDelay(3))
	assert.Equal(t, maxRetryGap, retryDelay(50))
}

func TestStreamOffset_TableName(t *testing.T) {
	assert.Equal(t, "stream_offsets", StreamOffset{}.TableName())
}
