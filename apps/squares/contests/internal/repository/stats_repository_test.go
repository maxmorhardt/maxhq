package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatsRepository_GetStats_Success(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT\s+\(SELECT COUNT\(\*\) FROM contests WHERE created_at >= CURRENT_DATE`).
		WillReturnRows(sqlmock.NewRows([]string{"contests_created_today", "squares_claimed_today", "total_active_contests"}).AddRow(3, 12, 5))

	stats, err := NewStatsRepository(gdb).GetStats(context.Background())

	require.NoError(t, err)
	assert.Equal(t, int64(3), stats.ContestsCreatedToday)
	assert.Equal(t, int64(12), stats.SquaresClaimedToday)
	assert.Equal(t, int64(5), stats.TotalActiveContests)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestStatsRepository_GetStats_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT`).WillReturnError(errors.New("query failed"))

	stats, err := NewStatsRepository(gdb).GetStats(context.Background())

	require.Error(t, err)
	assert.Nil(t, stats)
}
