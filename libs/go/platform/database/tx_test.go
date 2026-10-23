package database

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
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

	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	require.NoError(t, err)
	return db, mock
}

func TestTransactor_CommitsAndRunsAfterCommitHooks(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectCommit()

	called := false
	err := NewTransactor(db).Do(context.Background(), func(ctx context.Context) error {
		AfterCommit(ctx, func() { called = true })
		assert.False(t, called, "hook must wait for the commit")
		return nil
	})

	require.NoError(t, err)
	assert.True(t, called)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTransactor_RollsBackAndSkipsHooksOnError(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectRollback()

	called := false
	boom := errors.New("boom")
	err := NewTransactor(db).Do(context.Background(), func(ctx context.Context) error {
		AfterCommit(ctx, func() { called = true })
		return boom
	})

	assert.ErrorIs(t, err, boom)
	assert.False(t, called)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestTransactor_NestedDoJoinsOuterTransaction(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectCommit()

	tr := NewTransactor(db)
	err := tr.Do(context.Background(), func(ctx context.Context) error {
		return tr.Do(ctx, func(inner context.Context) error {
			assert.Same(t, ctx.Value(txKey{}), inner.Value(txKey{}))
			return nil
		})
	})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestConn_UsesTransactionWhenPresent(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectCommit()

	err := NewTransactor(db).Do(context.Background(), func(ctx context.Context) error {
		conn := Conn(ctx, db)
		state := ctx.Value(txKey{}).(*txState)
		assert.Equal(t, state.tx.Statement.ConnPool, conn.Statement.ConnPool)
		return nil
	})
	require.NoError(t, err)

	plain := Conn(context.Background(), db)
	assert.Equal(t, db.Statement.ConnPool, plain.Statement.ConnPool)
}

func TestInTx_RunsInTheCallersTransaction(t *testing.T) {
	db, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectRollback()

	err := NewTransactor(db).Do(context.Background(), func(ctx context.Context) error {
		return InTx(ctx, func(tx *gorm.DB) error {
			state := ctx.Value(txKey{}).(*txState)
			assert.Equal(t, state.tx.Statement.ConnPool, tx.Statement.ConnPool)
			return gorm.ErrRecordNotFound
		})
	})
	assert.ErrorIs(t, err, ErrNotFound)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestInTx_RefusesWithoutATransaction(t *testing.T) {
	called := false
	err := InTx(context.Background(), func(*gorm.DB) error {
		called = true
		return nil
	})
	assert.ErrorIs(t, err, ErrNoTransaction)
	assert.False(t, called)
}

func TestConn_ReadPrimaryRoutesToTheWriter(t *testing.T) {
	db, _ := newMockDB(t)

	_, onPrimary := Conn(ReadPrimary(context.Background()), db).Statement.Settings.Load("gorm:db_resolver:write")
	assert.True(t, onPrimary)

	_, onPlain := Conn(context.Background(), db).Statement.Settings.Load("gorm:db_resolver:write")
	assert.False(t, onPlain)
}

func TestAfterCommit_RunsImmediatelyWithoutTransaction(t *testing.T) {
	called := false
	AfterCommit(context.Background(), func() { called = true })
	assert.True(t, called)
}
