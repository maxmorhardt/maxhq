package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func userRows(email, initials string) *sqlmock.Rows {
	return sqlmock.NewRows([]string{"id", "email", "display_name", "default_initials", "created_at", "updated_at"}).
		AddRow(uuid.New().String(), email, "Max", initials, time.Now(), time.Now())
}

func TestUserRepository_GetByEmail(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users" WHERE email = \$1`).WillReturnRows(userRows("a@b.com", "MM"))

	user, err := NewUserRepository(gdb).GetByEmail(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Equal(t, "MM", user.DefaultInitials)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	_, err = NewUserRepository(gdb).GetByEmail(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestUserRepository_CreateIfMissing(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users" .* ON CONFLICT \("email"\) DO NOTHING`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(userRows("a@b.com", "MM"))

	user, err := NewUserRepository(gdb).CreateIfMissing(context.Background(), &model.User{Email: "a@b.com", DefaultInitials: "MM"})

	require.NoError(t, err)
	assert.Equal(t, "a@b.com", user.Email)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_CreateIfMissing_Errors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()
	_, err := NewUserRepository(gdb).CreateIfMissing(context.Background(), &model.User{Email: "a@b.com"})
	require.Error(t, err)

	gdb, mock = newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnError(errors.New("db"))
	_, err = NewUserRepository(gdb).CreateIfMissing(context.Background(), &model.User{Email: "a@b.com"})
	require.Error(t, err)
}

func TestUserRepository_UpdateInitials(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "users" SET "default_initials"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(userRows("a@b.com", "XY"))

	user, err := NewUserRepository(gdb).UpdateInitials(context.Background(), "a@b.com", "XY")

	require.NoError(t, err)
	assert.Equal(t, "XY", user.DefaultInitials)
}

func TestUserRepository_UpdateInitials_MissingAndErrors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "users"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()
	_, err := NewUserRepository(gdb).UpdateInitials(context.Background(), "a@b.com", "XY")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

	gdb, mock = newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "users"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()
	_, err = NewUserRepository(gdb).UpdateInitials(context.Background(), "a@b.com", "XY")
	require.Error(t, err)

	gdb, mock = newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "users"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnError(errors.New("db"))
	_, err = NewUserRepository(gdb).UpdateInitials(context.Background(), "a@b.com", "XY")
	require.Error(t, err)
}

func TestUserRepository_DeleteWithTombstone(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "users" WHERE email = \$1`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`INSERT INTO deleted_accounts .* ON CONFLICT \(email\) DO UPDATE`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	require.NoError(t, NewUserRepository(gdb).DeleteWithTombstone(context.Background(), "a@b.com", time.Now()))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_DeleteWithTombstone_RollsBack(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "users"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	require.Error(t, NewUserRepository(gdb).DeleteWithTombstone(context.Background(), "a@b.com", time.Now()))
}

func TestUserRepository_TombstonesSince(t *testing.T) {
	deletedAt := time.Now().Add(-time.Hour)
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT email, deleted_at FROM "deleted_accounts" WHERE deleted_at >= \$1`).
		WillReturnRows(sqlmock.NewRows([]string{"email", "deleted_at"}).AddRow("a@b.com", deletedAt))

	tombstones, err := NewUserRepository(gdb).TombstonesSince(context.Background(), time.Now().Add(-24*time.Hour))

	require.NoError(t, err)
	require.Len(t, tombstones, 1)
	assert.Equal(t, "a@b.com", tombstones[0].Email)
}
