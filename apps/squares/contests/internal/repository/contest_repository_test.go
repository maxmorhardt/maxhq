package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	// gorm preloads run in non-deterministic order, so don't require ordering
	mock.MatchExpectationsInOrder(false)

	gdb, err := gorm.Open(postgres.New(postgres.Config{
		Conn:                 sqlDB,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	return gdb, mock
}

func TestContestRepository_GetVisibilityByID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectQuery(`SELECT .* FROM "contests"`).
		WillReturnRows(sqlmock.NewRows([]string{"visibility"}).AddRow("public"))

	vis, err := repo.GetVisibilityByID(context.Background(), uuid.New())

	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPublic, vis)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ExistsByOwnerAndName(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectQuery(`SELECT count\(\*\) FROM "contests"`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	exists, err := repo.ExistsByOwnerAndName(context.Background(), "owner", "name")

	require.NoError(t, err)
	assert.True(t, exists)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Delete(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests" SET "status"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, repo.Delete(context.Background(), uuid.New()))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Update_BumpsVersion(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests" SET .* WHERE version = \$\d+ AND "id" = \$\d+`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	contest := &model.Contest{ID: uuid.New(), Name: "x", Version: 4}
	require.NoError(t, repo.Update(context.Background(), contest))
	assert.Equal(t, int64(5), contest.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Update_StaleVersionConflicts(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	// someone else bumped the version since this contest was read, so the guarded update matches nothing
	mock.ExpectExec(`UPDATE "contests"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	contest := &model.Contest{ID: uuid.New(), Name: "x", Version: 4}
	err := repo.Update(context.Background(), contest)

	require.ErrorIs(t, err, errs.ErrVersionConflict)
	assert.Equal(t, int64(4), contest.Version, "a failed write must not advance the in-memory version")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Update_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	contest := &model.Contest{ID: uuid.New(), Version: 2}
	require.Error(t, repo.Update(context.Background(), contest))
	assert.Equal(t, int64(2), contest.Version)
}

func TestContestRepository_GetIDsByGameID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	gameID := uuid.New()
	contestID := uuid.New()
	mock.ExpectQuery(`SELECT "id" FROM "contests" WHERE game_id = \$1 AND status NOT IN`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(contestID))

	ids, err := repo.GetIDsByGameID(context.Background(), gameID)
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{contestID}, ids)
	assert.NoError(t, mock.ExpectationsWereMet())
}

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

func TestContestRepository_ClaimSquare(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

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

	sq, err := repo.ClaimSquare(context.Background(), &model.Square{ID: squareID, ContestID: contestID}, "AB", "owner", "Owner Name")

	require.NoError(t, err)
	assert.Equal(t, "AB", sq.Value)
	assert.Equal(t, "owner", sq.Owner)
	assert.Equal(t, "owner", sq.UpdatedBy)
	assert.Equal(t, int64(2), sq.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClaimSquare_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	// the contest started between the service's check and this transaction
	expectActiveContestLock(mock, contestID, model.ContestStatusQ1)
	mock.ExpectRollback()

	sq, err := repo.ClaimSquare(context.Background(), &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClaimSquare_LostRace(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	expectClaimParticipantLock(mock, contestID, 5)
	// another claim committed first, so the guarded update matches no rows
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectRollback()

	sq, err := repo.ClaimSquare(context.Background(), &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")

	require.ErrorIs(t, err, errs.ErrSquareTaken)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClaimSquare_OverLimit(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	expectClaimParticipantLock(mock, contestID, 3)
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	// the claim pushed the caller past their allotment, so the write is rolled back
	mock.ExpectQuery(`SELECT count\(\*\) FROM "squares"`).
		WithArgs(contestID, "owner", "").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(4))
	mock.ExpectRollback()

	sq, err := repo.ClaimSquare(context.Background(), &model.Square{ID: uuid.New(), ContestID: contestID}, "AB", "owner", "Owner Name")

	require.ErrorIs(t, err, errs.ErrSquareLimitReached)
	assert.Nil(t, sq)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClearSquare(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	squareID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	expectSquareReload(mock, squareID, contestID, "", "", 3)
	mock.ExpectCommit()

	sq, err := repo.ClearSquare(context.Background(), &model.Square{ID: squareID, ContestID: contestID, Value: "AB", Owner: "o"})

	require.NoError(t, err)
	assert.Empty(t, sq.Owner)
	assert.Empty(t, sq.Value)
	assert.Equal(t, int64(3), sq.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClearSquare_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusQ2)
	mock.ExpectRollback()

	_, err := repo.ClearSquare(context.Background(), &model.Square{ID: uuid.New(), ContestID: contestID})

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestContestRepository_GhostSquare(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	squareID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnResult(sqlmock.NewResult(0, 1))
	expectSquareReload(mock, squareID, contestID, "AB", model.GhostUser, 4)
	mock.ExpectCommit()

	sq, err := repo.GhostSquare(context.Background(), &model.Square{ID: squareID, ContestID: contestID, Value: "AB", Owner: "o"})

	require.NoError(t, err)
	assert.Equal(t, model.GhostUser, sq.Owner)
	assert.Equal(t, "AB", sq.Value)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_GhostSquare_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	_, err := repo.GhostSquare(context.Background(), &model.Square{ID: uuid.New()})
	require.Error(t, err)
}

func TestContestRepository_ClearSquaresByOwner(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

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

	squares, err := repo.ClearSquaresByOwner(context.Background(), contestID, "o")

	require.NoError(t, err)
	assert.Len(t, squares, 2)
	for _, sq := range squares {
		assert.Empty(t, sq.Owner)
		assert.Empty(t, sq.Value)
		assert.Equal(t, int64(2), sq.Version)
	}
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClearSquaresByOwner_None(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusActive)
	mock.ExpectQuery(`SELECT "id" FROM "squares"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectCommit()

	squares, err := repo.ClearSquaresByOwner(context.Background(), contestID, "o")

	require.NoError(t, err)
	assert.Empty(t, squares)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ClearSquaresByOwner_ContestNoLongerActive(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	contestID := uuid.New()
	mock.ExpectBegin()
	expectActiveContestLock(mock, contestID, model.ContestStatusFinished)
	mock.ExpectRollback()

	_, err := repo.ClearSquaresByOwner(context.Background(), contestID, "o")

	require.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestContestRepository_GetByIDForUpdate(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	id := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "contests" .*FOR UPDATE`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "version"}).AddRow(id, "C1", 7))
	mock.ExpectQuery(`SELECT \* FROM "squares"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id"}))
	mock.ExpectQuery(`SELECT \* FROM "quarter_results"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id"}))

	contest, err := repo.GetByIDForUpdate(context.Background(), id)

	require.NoError(t, err)
	assert.Equal(t, int64(7), contest.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_GetByID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	id := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "contests"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow(id, "C1"))
	mock.ExpectQuery(`SELECT \* FROM "squares"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id"}).AddRow(uuid.New(), id))
	mock.ExpectQuery(`SELECT \* FROM "quarter_results"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id"}))

	contest, err := repo.GetByID(context.Background(), id)

	require.NoError(t, err)
	assert.Equal(t, id, contest.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Create(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contests"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(`INSERT INTO "squares"`).WillReturnResult(sqlmock.NewResult(1, 100))
	mock.ExpectExec(`INSERT INTO "contest_participants"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.Create(context.Background(), &model.Contest{ID: uuid.New(), Name: "C1"}, &model.ContestParticipant{UserID: "owner"})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Create_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contests"`).WillReturnError(errors.New("insert failed"))
	mock.ExpectRollback()

	err := repo.Create(context.Background(), &model.Contest{ID: uuid.New(), Name: "C1"}, &model.ContestParticipant{UserID: "owner"})
	require.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ApplyQuarterResults(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`INSERT INTO "quarter_results" .* ON CONFLICT`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	contestID := uuid.New()
	err := repo.ApplyQuarterResults(context.Background(), &model.Contest{ID: contestID, Name: "x"},
		[]model.QuarterResult{{ContestID: contestID, Quarter: 1, Winner: "u@example.com"}})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ApplyQuarterResults_NoResults(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.ApplyQuarterResults(context.Background(), &model.Contest{ID: uuid.New(), Name: "x"}, nil)
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ApplyQuarterResults_UpdateError(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	err := repo.ApplyQuarterResults(context.Background(), &model.Contest{ID: uuid.New(), Name: "x"}, nil)
	require.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_RollbackQuarterResult(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "quarter_results"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`UPDATE "contests"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.RollbackQuarterResult(context.Background(), uuid.New(), &model.Contest{ID: uuid.New(), Name: "x"})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_RollbackQuarterResult_DeleteError(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "quarter_results"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	err := repo.RollbackQuarterResult(context.Background(), uuid.New(), &model.Contest{ID: uuid.New(), Name: "x"})
	require.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
