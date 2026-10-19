package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestStatsService_GetStats_Success(t *testing.T) {
	want := &model.StatsResponse{ContestsCreatedToday: 3, SquaresClaimedToday: 12, TotalActiveContests: 5}
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetStats(mock.Anything).Return(want, nil)

	got, err := service.NewStatsService(repo, newMemCache()).GetStats(context.Background())

	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestStatsService_GetStats_CachesResult(t *testing.T) {
	want := &model.StatsResponse{ContestsCreatedToday: 3}
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetStats(mock.Anything).Return(want, nil).Once()

	svc := service.NewStatsService(repo, newMemCache())
	first, err := svc.GetStats(context.Background())
	require.NoError(t, err)
	second, err := svc.GetStats(context.Background())
	require.NoError(t, err)

	assert.Equal(t, want, first)
	assert.Equal(t, want, second)
}

func TestStatsService_GetStats_RepoError(t *testing.T) {
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetStats(mock.Anything).Return(nil, errors.New("db down"))

	got, err := service.NewStatsService(repo, newMemCache()).GetStats(context.Background())

	require.Error(t, err)
	assert.Nil(t, got)
}
