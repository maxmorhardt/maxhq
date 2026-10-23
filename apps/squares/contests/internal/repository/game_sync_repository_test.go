package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGameSyncRepository_UpsertGuardsAgainstOlderSnapshots(t *testing.T) {
	gdb, mock := newMockDB(t)
	gameID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "games" .* ON CONFLICT \("id"\) DO UPDATE SET .* WHERE games.updated_at IS NULL OR excluded.updated_at >= games.updated_at`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(`INSERT INTO "game_scores" .* ON CONFLICT \("game_id","quarter"\) DO UPDATE`).
		WillReturnResult(sqlmock.NewResult(1, 2))
	mock.ExpectCommit()

	game := &model.Game{
		ID:        gameID,
		ESPNID:    "401",
		Status:    model.GameStatusInProgress,
		UpdatedAt: time.Now(),
		Scores: []model.GameScore{
			{ID: uuid.New(), Quarter: 1, HomeScore: 7, AwayScore: 3},
			{ID: uuid.New(), Quarter: 2, HomeScore: 14, AwayScore: 3},
		},
	}
	require.NoError(t, inTxErr(gdb, func(ctx context.Context) error { return NewGameSyncRepository(gdb).Upsert(ctx, game) }))
	assert.Len(t, game.Scores, 2, "the caller's game is not mutated")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameSyncRepository_UpsertWithoutScores(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "games"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	require.NoError(t, inTxErr(gdb, func(ctx context.Context) error {
		return NewGameSyncRepository(gdb).Upsert(ctx, &model.Game{ID: uuid.New(), ESPNID: "401"})
	}))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameSyncRepository_UpsertError(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "games"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	require.Error(t, inTxErr(gdb, func(ctx context.Context) error {
		return NewGameSyncRepository(gdb).Upsert(ctx, &model.Game{ID: uuid.New()})
	}))
}

func TestGameSyncRepository_GetByID(t *testing.T) {
	gdb, mock := newMockDB(t)
	gameID := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "games" WHERE id = \$1`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "status"}).AddRow(gameID, "final"))
	mock.ExpectQuery(`SELECT \* FROM "game_scores"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "game_id", "quarter"}).AddRow(uuid.New(), gameID, 1))

	game, err := NewGameSyncRepository(gdb).GetByID(context.Background(), gameID)

	require.NoError(t, err)
	assert.Equal(t, model.GameStatusFinal, game.Status)
	assert.Len(t, game.Scores, 1)
}
