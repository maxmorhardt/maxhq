package repository

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlayerRepository_GetByContestAndUser(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewPlayerRepository(gdb)

	mock.ExpectQuery(`SELECT contest_players\.\*, COALESCE\(users\.display_name, ''\) AS display_name FROM "contest_players" LEFT JOIN users ON users\.email = contest_players\.user_id WHERE contest_players\.contest_id = \$1 AND contest_players\.user_id = \$2`).
		WillReturnRows(sqlmock.NewRows([]string{"contest_id", "user_id", "role", "max_squares", "display_name"}).
			AddRow(uuid.New(), "u1", "owner", 10, "Olive Owens"))

	p, err := repo.GetByContestAndUser(context.Background(), uuid.New(), "u1")

	require.NoError(t, err)
	assert.Equal(t, "u1", p.UserID)
	assert.Equal(t, "Olive Owens", p.DisplayName, "events and responses carry this player, so it needs the name too")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestPlayerRepository_GetAllByContestID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewPlayerRepository(gdb)

	mock.ExpectQuery(`SELECT contest_players\.\*, COALESCE\(users\.display_name, ''\) AS display_name FROM "contest_players" LEFT JOIN users ON users\.email = contest_players\.user_id`).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "role", "display_name"}).
			AddRow("u1", "owner", "Ann Smith").
			AddRow("u2", "player", ""))

	ps, err := repo.GetAllByContestID(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Len(t, ps, 2)
	assert.Equal(t, "Ann Smith", ps[0].DisplayName, "each player carries the name other players see")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestPlayerRepository_SetMaxSquares(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewPlayerRepository(gdb)
	contestID, first, second := uuid.New(), uuid.New(), uuid.New()
	at := time.Now()

	mock.ExpectBegin()
	mock.ExpectQuery(`UPDATE "contest_players" SET "max_squares"=\$1,"updated_at"=\$2 WHERE contest_id = \$3 AND id IN \(\$4,\$5\) AND max_squares = 0 RETURNING "id"`).
		WithArgs(5, at, contestID, first, second).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(first))
	mock.ExpectCommit()

	updated, err := repo.SetMaxSquares(context.Background(), contestID, []uuid.UUID{first, second}, 5, at)

	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{first}, updated, "a player who already had squares, or left, isn't reported")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestPlayerRepository_Delete(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewPlayerRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "contest_players"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.Delete(context.Background(), uuid.New(), "u1")

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestPlayerRepository_Create(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewPlayerRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contest_players"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	p := &model.ContestPlayer{ContestID: uuid.New(), UserID: "u1", Role: model.PlayerRolePlayer}
	require.NoError(t, repo.Create(context.Background(), p))
	assert.NotEqual(t, uuid.Nil, p.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}
