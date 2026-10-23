package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/squares/contracts"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestStatsService_GetSiteStats_Success(t *testing.T) {
	want := &model.StatsResponse{ContestsCreatedToday: 3, SquaresClaimedToday: 12, TotalActiveContests: 5}
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetSiteStats(mock.Anything).Return(want, nil)

	got, err := service.NewStatsService(repo, newMemCache()).GetSiteStats(context.Background())

	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestStatsService_GetSiteStats_CachesResult(t *testing.T) {
	want := &model.StatsResponse{ContestsCreatedToday: 3}
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetSiteStats(mock.Anything).Return(want, nil).Once()

	svc := service.NewStatsService(repo, newMemCache())
	first, err := svc.GetSiteStats(context.Background())
	require.NoError(t, err)
	second, err := svc.GetSiteStats(context.Background())
	require.NoError(t, err)

	assert.Equal(t, want, first)
	assert.Equal(t, want, second)
}

func TestStatsService_GetSiteStats_RepoError(t *testing.T) {
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetSiteStats(mock.Anything).Return(nil, errors.New("db down"))

	got, err := service.NewStatsService(repo, newMemCache()).GetSiteStats(context.Background())

	require.Error(t, err)
	assert.Nil(t, got)
}

func TestStatsService_GetUserStats(t *testing.T) {
	repo := mocks.NewStatsRepository(t)
	want := &model.UserStatsResponse{QuarterWins: 3}
	repo.EXPECT().GetUserStats(mock.Anything, "a@b.com").Return(want, nil)

	got, err := service.NewStatsService(repo, newMemCache()).GetUserStats(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestStatsService_GetUserStats_Error(t *testing.T) {
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetUserStats(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	_, err := service.NewStatsService(repo, newMemCache()).GetUserStats(context.Background(), "a@b.com")

	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestStatsService_GetUserActivity(t *testing.T) {
	first := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, "a@b.com").Return(nil, nil)
	repo.EXPECT().GetFirstActivity(mock.Anything, "a@b.com").Return(&first, nil)

	summary, err := service.NewStatsService(repo, newMemCache()).GetUserActivity(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.NotNil(t, summary.ActiveContests, "an empty list encodes as [] for the accounts client")
	assert.Equal(t, &first, summary.FirstActivity)
}

func TestStatsService_GetUserActivity_Errors(t *testing.T) {
	repo := mocks.NewStatsRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err := service.NewStatsService(repo, newMemCache()).GetUserActivity(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	repo = mocks.NewStatsRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return([]contracts.UserActiveContest{{Name: "C"}}, nil)
	repo.EXPECT().GetFirstActivity(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err = service.NewStatsService(repo, newMemCache()).GetUserActivity(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}
