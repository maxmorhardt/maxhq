package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/redis/go-redis/v9"
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

func TestFeed_MembersSkipsTheLookupWithoutACache(t *testing.T) {
	assert.Nil(t, service.NewFeedService(mocks.NewFeedRepository(t), nil).Members(context.Background(), uuid.New()))
}

var (
	onPrimary = mock.MatchedBy(database.ReadsPrimary)
	onReplica = mock.MatchedBy(func(ctx context.Context) bool { return !database.ReadsPrimary(ctx) })
)

func redisCache(t *testing.T) (*miniredis.Miniredis, cache.Cache) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return mr, cache.NewRedisCache(client, "test")
}

func TestFeed_ReadsTheReplicaByDefault(t *testing.T) {
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(onReplica, "u", mock.Anything).Return(nil, nil).Once()

	_, c := redisCache(t)
	_, err := service.NewFeedService(repo, c).List(context.Background(), "u", &model.ContestFeedFilter{Limit: 20})
	require.NoError(t, err)
}

func TestFeed_ReadsThePrimaryRightAfterTheUsersOwnWrite(t *testing.T) {
	ctx := context.Background()
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(onPrimary, "u", mock.Anything).Return(nil, nil).Once()

	_, c := redisCache(t)
	feed := service.NewFeedService(repo, c)
	feed.Invalidate(ctx, "u")

	_, err := feed.List(ctx, "u", &model.ContestFeedFilter{Limit: 20})
	require.NoError(t, err)
}

func TestFeed_ReturnsToTheReplicaOnceThePrimaryWindowPasses(t *testing.T) {
	ctx := context.Background()
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().List(onReplica, "u", mock.Anything).Return(nil, nil).Once()

	mr, c := redisCache(t)
	feed := service.NewFeedService(repo, c)
	feed.Invalidate(ctx, "u")
	mr.FastForward(time.Minute)

	_, err := feed.List(ctx, "u", &model.ContestFeedFilter{Limit: 20})
	require.NoError(t, err)
}

func TestFeed_ContestWideInvalidationStaysOnTheReplica(t *testing.T) {
	ctx := context.Background()
	contestID := uuid.New()
	repo := mocks.NewFeedRepository(t)
	repo.EXPECT().Members(mock.Anything, contestID).Return([]string{"u", "other"}, nil).Once()
	repo.EXPECT().List(onReplica, "u", mock.Anything).Return(nil, nil).Twice()

	_, c := redisCache(t)
	feed := service.NewFeedService(repo, c)
	_, err := feed.List(ctx, "u", &model.ContestFeedFilter{Limit: 20})
	require.NoError(t, err)

	time.Sleep(time.Millisecond)
	feed.InvalidateContest(ctx, contestID)
	_, err = feed.List(ctx, "u", &model.ContestFeedFilter{Limit: 20})
	require.NoError(t, err)
}
