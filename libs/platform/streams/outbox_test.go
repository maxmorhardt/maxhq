package streams

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{SkipDefaultTransaction: true})
	require.NoError(t, err)
	return db, mock
}

func TestOutbox_AddInsertsAndNotifiesImmediatelyWithoutTransaction(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectExec(`INSERT INTO "outbox"`).WillReturnResult(sqlmock.NewResult(0, 1))

	notified := 0
	err := NewOutbox(db, func() { notified++ }).Add(context.Background(), "test", "thing.updated", map[string]string{"a": "b"})

	require.NoError(t, err)
	assert.Equal(t, 1, notified)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOutbox_AddNotifiesOnlyAfterCommit(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "outbox"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	notified := 0
	ob := NewOutbox(db, func() { notified++ })
	err := database.NewTransactor(db).Do(context.Background(), func(ctx context.Context) error {
		require.NoError(t, ob.Add(ctx, "test", "thing.updated", "payload"))
		assert.Equal(t, 0, notified)
		return nil
	})

	require.NoError(t, err)
	assert.Equal(t, 1, notified)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOutbox_AddRejectsUnmarshalablePayload(t *testing.T) {
	db, _ := newMockDB(t)

	err := NewOutbox(db, nil).Add(context.Background(), "test", "thing.updated", make(chan int))

	assert.ErrorContains(t, err, "failed to marshal outbox payload")
}

func TestOutbox_AddPropagatesInsertError(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectExec(`INSERT INTO "outbox"`).WillReturnError(assert.AnError)

	err := NewOutbox(db, nil).Add(context.Background(), "test", "thing.updated", "payload")

	assert.ErrorIs(t, err, assert.AnError)
}

func TestOutboxEvent_TableName(t *testing.T) {
	assert.Equal(t, "outbox", OutboxEvent{}.TableName())
}
