package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func summaries(n int) []model.ContestSummary {
	out := make([]model.ContestSummary, n)
	base := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	for i := range out {
		out[i] = model.ContestSummary{
			ID:        uuid.New(),
			UpdatedAt: base.Add(-time.Duration(i) * time.Hour),
			CreatedAt: base.Add(-time.Duration(i) * 24 * time.Hour),
		}
	}
	return out
}

func TestFeed_ReturnsCursorWhenMoreRemain(t *testing.T) {
	rows := summaries(3)
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(mock.Anything, "u", mock.MatchedBy(func(f *model.ContestFeedFilter) bool { return f.Limit == 3 })).Return(rows, nil)

	resp, err := service.NewFeedService(repo, nil).List(context.Background(), "u", &model.ContestFeedFilter{Limit: 2})

	require.NoError(t, err)
	assert.Len(t, resp.Contests, 2)
	cursor, err := model.DecodeFeedCursor(resp.NextCursor)
	require.NoError(t, err)
	assert.Equal(t, rows[1].ID, cursor.ID)
	assert.True(t, rows[1].UpdatedAt.Equal(cursor.At))
}

func TestFeed_LastPageHasNoCursorAndNeverNil(t *testing.T) {
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(mock.Anything, mock.Anything, mock.Anything).Return(nil, nil)

	resp, err := service.NewFeedService(repo, nil).List(context.Background(), "u", &model.ContestFeedFilter{Limit: 20})

	require.NoError(t, err)
	assert.Empty(t, resp.NextCursor)
	assert.NotNil(t, resp.Contests)
}

func TestFeed_PropagatesRepositoryError(t *testing.T) {
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(mock.Anything, mock.Anything, mock.Anything).Return(nil, assert.AnError)

	_, err := service.NewFeedService(repo, nil).List(context.Background(), "u", &model.ContestFeedFilter{Limit: 20})

	assert.ErrorIs(t, err, assert.AnError)
}

func TestFeed_CachesUntilInvalidated(t *testing.T) {
	ctx := context.Background()
	contestID := uuid.New()
	filter := &model.ContestFeedFilter{Limit: 20}

	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(mock.Anything, "u", mock.Anything).Return(summaries(1), nil).Times(3)
	repo.EXPECT().Members(mock.Anything, contestID).Return([]string{"u", "other"}, nil).Once()

	feed := service.NewFeedService(repo, newMemCache())

	_, err := feed.List(ctx, "u", filter)
	require.NoError(t, err)
	_, err = feed.List(ctx, "u", filter)
	require.NoError(t, err)

	feed.Invalidate(ctx, "u")
	_, err = feed.List(ctx, "u", filter)
	require.NoError(t, err)

	time.Sleep(time.Millisecond)
	feed.InvalidateContest(ctx, contestID)
	_, err = feed.List(ctx, "u", filter)
	require.NoError(t, err)
}

func TestFeed_InvalidateContestToleratesLookupFailure(t *testing.T) {
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().Members(mock.Anything, mock.Anything).Return(nil, assert.AnError)

	service.NewFeedService(repo, newMemCache()).InvalidateContest(context.Background(), uuid.New())
}
