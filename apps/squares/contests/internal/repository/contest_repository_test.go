package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
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

// runs a repository call the way a service does, inside its unit of work
func inTx[T any](gdb *gorm.DB, call func(ctx context.Context) (T, error)) (T, error) {
	var out T
	err := database.NewTransactor(gdb).Do(context.Background(), func(ctx context.Context) error {
		var err error
		out, err = call(ctx)
		return err
	})
	return out, err
}

func inTxErr(gdb *gorm.DB, call func(ctx context.Context) error) error {
	return database.NewTransactor(gdb).Do(context.Background(), call)
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

	err := inTxErr(gdb, func(ctx context.Context) error {
		return repo.Create(ctx, &model.Contest{ID: uuid.New(), Name: "C1"}, &model.ContestParticipant{UserID: "owner"})
	})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_Create_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "contests"`).WillReturnError(errors.New("insert failed"))
	mock.ExpectRollback()

	err := inTxErr(gdb, func(ctx context.Context) error {
		return repo.Create(ctx, &model.Contest{ID: uuid.New(), Name: "C1"}, &model.ContestParticipant{UserID: "owner"})
	})
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
	err := inTxErr(gdb, func(ctx context.Context) error {
		return repo.ApplyQuarterResults(ctx, &model.Contest{ID: contestID, Name: "x"},
			[]model.QuarterResult{{ContestID: contestID, Quarter: 1, Winner: "u@example.com"}})
	})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ApplyQuarterResults_NoResults(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := inTxErr(gdb, func(ctx context.Context) error {
		return repo.ApplyQuarterResults(ctx, &model.Contest{ID: uuid.New(), Name: "x"}, nil)
	})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestContestRepository_ApplyQuarterResults_UpdateError(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewContestRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "contests"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	err := inTxErr(gdb, func(ctx context.Context) error {
		return repo.ApplyQuarterResults(ctx, &model.Contest{ID: uuid.New(), Name: "x"}, nil)
	})
	require.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
