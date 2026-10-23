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

func TestStatsRepository_GetSiteStats_Success(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT\s+\(SELECT COUNT\(\*\) FROM contests WHERE created_at >= CURRENT_DATE`).
		WillReturnRows(sqlmock.NewRows([]string{"contests_created_today", "squares_claimed_today", "total_active_contests"}).AddRow(3, 12, 5))

	stats, err := NewStatsRepository(gdb).GetSiteStats(context.Background())

	require.NoError(t, err)
	assert.Equal(t, int64(3), stats.ContestsCreatedToday)
	assert.Equal(t, int64(12), stats.SquaresClaimedToday)
	assert.Equal(t, int64(5), stats.TotalActiveContests)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestStatsRepository_GetSiteStats_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT`).WillReturnError(errors.New("query failed"))

	stats, err := NewStatsRepository(gdb).GetSiteStats(context.Background())

	require.Error(t, err)
	assert.Nil(t, stats)
}

func TestStatsRepository_GetUserStats(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`AS contests_created`).
		WillReturnRows(sqlmock.NewRows([]string{"contests_created", "contests_joined", "squares_claimed", "quarter_wins", "quarters_played"}).
			AddRow(3, 7, 42, 5, 20))

	stats, err := NewStatsRepository(gdb).GetUserStats(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Equal(t, &model.UserStatsResponse{ContestsCreated: 3, ContestsJoined: 7, SquaresClaimed: 42, QuarterWins: 5, QuartersPlayed: 20}, stats)
}

func TestStatsRepository_GetUserStats_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`AS contests_created`).WillReturnError(errors.New("db"))

	_, err := NewStatsRepository(gdb).GetUserStats(context.Background(), "a@b.com")
	require.Error(t, err)
}

func TestStatsRepository_GetActiveContests(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT c.id, c.name, c.owner`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "owner", "role"}).AddRow(uuid.NewString(), "C1", "a@b.com", "owner"))

	active, err := NewStatsRepository(gdb).GetActiveContests(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Len(t, active, 1)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT c.id`).WillReturnError(errors.New("db"))
	_, err = NewStatsRepository(gdb).GetActiveContests(context.Background(), "a@b.com")
	require.Error(t, err)
}

func TestStatsRepository_GetFirstActivity(t *testing.T) {
	first := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(first))

	got, err := NewStatsRepository(gdb).GetFirstActivity(context.Background(), "a@b.com")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.True(t, first.Equal(*got))

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(nil))
	got, err = NewStatsRepository(gdb).GetFirstActivity(context.Background(), "a@b.com")
	require.NoError(t, err)
	assert.Nil(t, got)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnError(errors.New("db"))
	_, err = NewStatsRepository(gdb).GetFirstActivity(context.Background(), "a@b.com")
	require.Error(t, err)
}
