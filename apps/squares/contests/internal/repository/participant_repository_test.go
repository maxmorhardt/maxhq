package repository

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParticipantRepository_GetByContestAndUser(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewParticipantRepository(gdb)

	mock.ExpectQuery(`SELECT contest_participants\.\*, COALESCE\(users\.display_name, ''\) AS display_name FROM "contest_participants" LEFT JOIN users ON users\.email = contest_participants\.user_id WHERE contest_participants\.contest_id = \$1 AND contest_participants\.user_id = \$2`).
		WillReturnRows(sqlmock.NewRows([]string{"contest_id", "user_id", "role", "max_squares", "display_name"}).
			AddRow(uuid.New(), "u1", "owner", 10, "Olive Owens"))

	p, err := repo.GetByContestAndUser(context.Background(), uuid.New(), "u1")

	require.NoError(t, err)
	assert.Equal(t, "u1", p.UserID)
	assert.Equal(t, "Olive Owens", p.DisplayName, "events and responses carry this participant, so it needs the name too")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestParticipantRepository_GetAllByContestID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewParticipantRepository(gdb)

	mock.ExpectQuery(`SELECT contest_participants\.\*, COALESCE\(users\.display_name, ''\) AS display_name FROM "contest_participants" LEFT JOIN users ON users\.email = contest_participants\.user_id`).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "role", "display_name"}).
			AddRow("u1", "owner", "Ann Smith").
			AddRow("u2", "participant", ""))

	ps, err := repo.GetAllByContestID(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Len(t, ps, 2)
	assert.Equal(t, "Ann Smith", ps[0].DisplayName, "each participant carries the name other participants see")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestParticipantRepository_GetTotalAllocatedSquares(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewParticipantRepository(gdb)

	mock.ExpectQuery(`SUM\(max_squares\)`).
		WillReturnRows(sqlmock.NewRows([]string{"coalesce"}).AddRow(25))

	total, err := repo.GetTotalAllocatedSquares(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Equal(t, 25, total)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestParticipantRepository_Delete(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewParticipantRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "contest_participants"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.Delete(context.Background(), uuid.New(), "u1")

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestParticipantRepository_Create(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewParticipantRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contest_participants"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	p := &model.ContestParticipant{ContestID: uuid.New(), UserID: "u1", Role: model.ParticipantRoleParticipant}
	require.NoError(t, repo.Create(context.Background(), p))
	assert.NotEqual(t, uuid.Nil, p.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}
