package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func expectActiveContestLock(mock sqlmock.Sqlmock, contestID uuid.UUID, status model.ContestStatus) {
	mock.ExpectQuery(`SELECT "id","status" FROM "contests" WHERE id = \$1 .*FOR SHARE`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "status"}).AddRow(contestID, status))
}

func expectSquareReload(mock sqlmock.Sqlmock, squareID, contestID uuid.UUID, value, owner string, version int64) {
	mock.ExpectQuery(`SELECT \* FROM "squares" WHERE id = \$1`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "value", "owner", "updated_by", "version"}).
			AddRow(squareID, contestID, value, owner, owner, version))
}

func expectClaimParticipantLock(mock sqlmock.Sqlmock, contestID uuid.UUID, maxSquares int) {
	mock.ExpectQuery(`SELECT \* FROM "contest_participants".*FOR UPDATE`).
		WithArgs(contestID, "owner", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "user_id", "max_squares"}).
			AddRow(uuid.New(), contestID, "owner", maxSquares))
}

func TestSquareRepository_Claim(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	squareID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	expectClaimParticipantLock(mock, contestID, 5)
	mock.ExpectExec(`UPDATE "squares" SET .*"version"=version \+ 1`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "squares"`).
		WithArgs(contestID, "owner", "").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	expectSquareReload(mock, squareID, contestID, "AB", "owner", 2)
	mock.ExpectCommit()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Claim(ctx, &model.Square{ID: squareID, ContestID: contestID}, "AB", "owner", "Owner Name")
	})

	require.NoError(t, err)
	assert.Equal(t, "AB", sq.Value)
	assert.Equal(t, "owner", sq.Owner)
	assert.Equal(t, "owner", sq.UpdatedBy)
	assert.Equal(t, int64(2), sq.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Claim_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusQ1)
	mock.ExpectRollback()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Claim(ctx, &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")
	})

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Claim_LostRace(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	expectClaimParticipantLock(mock, contestID, 5)
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectRollback()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Claim(ctx, &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")
	})

	require.ErrorIs(t, err, errs.ErrSquareTaken)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Claim_OverLimit(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	expectClaimParticipantLock(mock, contestID, 3)
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "squares"`).
		WithArgs(contestID, "owner", "").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(4))
	mock.ExpectRollback()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Claim(ctx, &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")
	})

	require.ErrorIs(t, err, errs.ErrSquareLimitReached)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Clear(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	squareID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	expectSquareReload(mock, squareID, contestID, "", "", 3)
	mock.ExpectCommit()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Clear(ctx, &model.Square{ID: squareID, ContestID: contestID, Value: "AB", Owner: "o"})
	})

	require.NoError(t, err)
	assert.Empty(t, sq.Owner)
	assert.Empty(t, sq.Value)
	assert.Equal(t, int64(3), sq.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Clear_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusQ2)
	mock.ExpectRollback()

	_, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Clear(ctx, &model.Square{ID: uuid.New(), ContestID: contestID})
	})

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestSquareRepository_Ghost(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	squareID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	expectSquareReload(mock, squareID, contestID, "AB", model.GhostUser, 4)
	mock.ExpectCommit()

	sq, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Ghost(ctx, &model.Square{ID: squareID, ContestID: contestID, Value: "AB", Owner: "o"})
	})

	require.NoError(t, err)
	assert.Equal(t, model.GhostUser, sq.Owner)
	assert.Equal(t, "AB", sq.Value)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_Ghost_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	_, err := inTx(gdb, func(ctx context.Context) (*model.Square, error) {
		return repo.Ghost(ctx, &model.Square{ID: uuid.New()})
	})
	require.Error(t, err)
}

func TestSquareRepository_ClearByOwner(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	first, second := uuid.New(), uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	mock.ExpectQuery(`SELECT "id" FROM "squares" WHERE contest_id = \$1 AND owner = \$2`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(first).AddRow(second))
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectQuery(`SELECT \* FROM "squares" WHERE id IN`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "owner", "value", "version"}).
			AddRow(first, contestID, "", "", 2).
			AddRow(second, contestID, "", "", 2))
	mock.ExpectCommit()

	squares, err := inTx(gdb, func(ctx context.Context) ([]model.Square, error) { return repo.ClearByOwner(ctx, contestID, "o") })

	require.NoError(t, err)
	assert.Len(t, squares, 2)
	for _, sq := range squares {
		assert.Empty(t, sq.Owner)
		assert.Empty(t, sq.Value)
		assert.Equal(t, int64(2), sq.Version)
	}
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_ClearByOwner_None(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	mock.ExpectQuery(`SELECT "id" FROM "squares"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectCommit()

	squares, err := inTx(gdb, func(ctx context.Context) ([]model.Square, error) { return repo.ClearByOwner(ctx, contestID, "o") })

	require.NoError(t, err)
	assert.Empty(t, squares)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_ClearByOwner_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusFinished)
	mock.ExpectRollback()

	_, err := inTx(gdb, func(ctx context.Context) ([]model.Square, error) { return repo.ClearByOwner(ctx, contestID, "o") })

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestSquareRepository_CountByOwner(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewSquareRepository(gdb)

	mock.ExpectQuery(`SELECT count\(\*\) FROM "squares"`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	count, err := repo.CountByOwner(context.Background(), uuid.New(), "u1")

	require.NoError(t, err)
	assert.Equal(t, 3, count)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_UpdateInitials(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares" SET "value"=\$1,"version"=version \+ 1,"updated_at"=\$2 WHERE owner = \$\d+ AND value != \$\d+ AND contest_id IN \(SELECT "id" FROM "contests" WHERE status NOT IN`).
		WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectQuery(`SELECT \* FROM "squares" WHERE owner = \$1`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "value", "owner"}).
			AddRow(uuid.New(), contestID, "XY", "a@b.com").
			AddRow(uuid.New(), contestID, "XY", "a@b.com"))
	mock.ExpectCommit()

	squares, err := inTx(gdb, func(ctx context.Context) ([]model.Square, error) {
		return NewSquareRepository(gdb).UpdateInitials(ctx, "a@b.com", "XY")
	})

	require.NoError(t, err)
	assert.Len(t, squares, 2)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSquareRepository_UpdateInitials_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	_, err := inTx(gdb, func(ctx context.Context) ([]model.Square, error) {
		return NewSquareRepository(gdb).UpdateInitials(ctx, "a@b.com", "XY")
	})

	require.Error(t, err)
}
