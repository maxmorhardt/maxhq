package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBanRepository_Exists(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()

	mock.ExpectQuery(`SELECT count\(\*\) FROM "contest_bans" WHERE contest_id = \$1 AND user_id = \$2`).
		WithArgs(contestID, "a@b.com").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	banned, err := NewBanRepository(gdb).Exists(context.Background(), contestID, "a@b.com")

	require.NoError(t, err)
	assert.True(t, banned)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBanRepository_GetAllByContestID(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()

	mock.ExpectQuery(`SELECT contest_bans\.\*, COALESCE\(users\.display_name, ''\) AS display_name FROM "contest_bans" LEFT JOIN users ON users\.email = contest_bans\.user_id WHERE contest_bans\.contest_id = \$1 ORDER BY contest_bans\.created_at DESC`).
		WithArgs(contestID).
		WillReturnRows(sqlmock.NewRows([]string{"contest_id", "user_id", "display_name"}).
			AddRow(contestID, "a@b.com", "Ann Smith").
			AddRow(contestID, "c@d.com", ""))

	bans, err := NewBanRepository(gdb).GetAllByContestID(context.Background(), contestID)

	require.NoError(t, err)
	require.Len(t, bans, 2)
	assert.Equal(t, "Ann Smith", bans[0].DisplayName)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBanRepository_CreateIgnoresARepeat(t *testing.T) {
	gdb, mock := newMockDB(t)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contest_bans" .* ON CONFLICT DO NOTHING`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	err := NewBanRepository(gdb).Create(context.Background(), &model.ContestBan{ContestID: uuid.New(), UserID: "a@b.com"})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBanRepository_Delete(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "contest_bans" WHERE contest_id = \$1 AND user_id = \$2`).
		WithArgs(contestID, "a@b.com").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, NewBanRepository(gdb).Delete(context.Background(), contestID, "a@b.com"))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestBanRepository_Errors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT count`).WillReturnError(errors.New("db"))

	_, err := NewBanRepository(gdb).Exists(context.Background(), uuid.New(), "a@b.com")
	assert.Error(t, err)
}
