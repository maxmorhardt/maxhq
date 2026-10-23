package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func userRows(email, initials string) *sqlmock.Rows {
	return sqlmock.NewRows([]string{"id", "email", "display_name", "default_initials", "created_at", "updated_at"}).
		AddRow(uuid.New(), email, "Max Morhardt", initials, time.Now(), time.Now())
}

func TestUserRepository_GetOrCreate_Existing(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users" WHERE email = \$1`).WillReturnRows(userRows("a@b.com", "MM"))

	user, err := NewUserRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max Morhardt", "MM")

	require.NoError(t, err)
	assert.Equal(t, "MM", user.DefaultInitials)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_GetOrCreate_CreatesMissing(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.MatchExpectationsInOrder(true)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users" .* ON CONFLICT \("email"\) DO NOTHING`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(userRows("a@b.com", "MM"))

	user, err := NewUserRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max Morhardt", "MM")

	require.NoError(t, err)
	assert.Equal(t, "a@b.com", user.Email)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_GetOrCreate_Errors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnError(errors.New("db"))

	_, err := NewUserRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max", "M")
	require.Error(t, err)

	gdb, mock = newMockDB(t)
	mock.MatchExpectationsInOrder(true)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users"`).WillReturnError(errors.New("insert"))
	mock.ExpectRollback()

	_, err = NewUserRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max", "M")
	require.Error(t, err)
}

func TestUserRepository_Upsert(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users" .* ON CONFLICT \("email"\) DO UPDATE SET "display_name"="excluded"."display_name","default_initials"="excluded"."default_initials"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := NewUserRepository(gdb).Upsert(context.Background(), &model.User{Email: "a@b.com", DefaultInitials: "XY"})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_Scrub(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "squares" SET .*"owner"=\$\d+.*WHERE owner = \$\d+ AND contest_id IN .* RETURNING \*`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "value", "owner"}).AddRow(uuid.New(), contestID, "", ""))
	for range 10 {
		mock.ExpectExec(`UPDATE "(squares|quarter_results|contests|contest_invites)" SET`).WillReturnResult(sqlmock.NewResult(0, 0))
	}
	mock.ExpectQuery(`DELETE FROM "contest_participants" WHERE user_id = \$1 RETURNING \*`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "user_id"}).AddRow(uuid.New(), contestID, "a@b.com"))
	mock.ExpectExec(`DELETE FROM "users"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	var cleared []model.Square
	var removed []model.ContestParticipant
	require.NoError(t, inTxErr(gdb, func(ctx context.Context) error {
		var err error
		cleared, removed, err = NewUserRepository(gdb).Scrub(ctx, "a@b.com")
		return err
	}))
	require.Len(t, cleared, 1)
	assert.Equal(t, contestID, cleared[0].ContestID)
	require.Len(t, removed, 1)
	assert.Equal(t, "a@b.com", removed[0].UserID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserRepository_Scrub_NeedsATransaction(t *testing.T) {
	gdb, _ := newMockDB(t)
	_, _, err := NewUserRepository(gdb).Scrub(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, database.ErrNoTransaction)
}

func TestUserRepository_Scrub_RollsBackOnError(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	require.Error(t, inTxErr(gdb, func(ctx context.Context) error {
		_, _, err := NewUserRepository(gdb).Scrub(ctx, "a@b.com")
		return err
	}))
}
