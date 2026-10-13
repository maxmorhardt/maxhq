package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
)

const (
	feedCacheTTL      = 2 * time.Minute
	feedGenerationTTL = time.Hour
)

type FeedService interface {
	List(ctx context.Context, user string, f *model.ContestFeedFilter) (*model.ContestFeedResponse, error)
	Invalidate(ctx context.Context, users ...string)
	InvalidateContest(ctx context.Context, contestID uuid.UUID)
}

type feedService struct {
	repo  repository.FeedRepository
	cache cache.Cache
	now   func() time.Time
}

func NewFeedService(repo repository.FeedRepository, c cache.Cache) FeedService {
	return &feedService{repo: repo, cache: c, now: time.Now}
}

// cached per user under a generation that every write touching the user bumps
func (s *feedService) List(ctx context.Context, user string, f *model.ContestFeedFilter) (*model.ContestFeedResponse, error) {
	key, err := s.cacheKey(ctx, user, f)
	if err != nil {
		return nil, err
	}

	return cache.GetOrLoad(ctx, s.cache, "contest_feed", key, feedCacheTTL, func(ctx context.Context) (*model.ContestFeedResponse, error) {
		page := *f
		page.Limit = f.Limit + 1

		rows, err := s.repo.List(ctx, user, &page)
		if err != nil {
			logging.FromContext(ctx).Error("failed to list contest feed", "error", err)
			return nil, err
		}

		resp := &model.ContestFeedResponse{Contests: rows}
		if len(rows) > f.Limit {
			resp.Contests = rows[:f.Limit]
			last := resp.Contests[f.Limit-1]
			at := last.UpdatedAt
			if f.Sort == model.FeedSortCreated {
				at = last.CreatedAt
			}
			resp.NextCursor = model.FeedCursor{At: at, ID: last.ID}.Encode()
		}
		if resp.Contests == nil {
			resp.Contests = []model.ContestSummary{}
		}
		return resp, nil
	})
}

func (s *feedService) Invalidate(ctx context.Context, users ...string) {
	if s.cache == nil {
		return
	}

	gen := []byte(strconv.FormatInt(s.now().UnixNano(), 10))
	for _, u := range users {
		if u == "" {
			continue
		}
		if err := s.cache.Set(ctx, generationKey(u), gen, feedGenerationTTL); err != nil {
			logging.FromContext(ctx).Warn("failed to invalidate contest feed", "user", u, "error", err)
		}
	}
}

func (s *feedService) InvalidateContest(ctx context.Context, contestID uuid.UUID) {
	if s.cache == nil {
		return
	}

	members, err := s.repo.Members(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Warn("failed to load contest members for feed invalidation", "contest_id", contestID, "error", err)
		return
	}
	s.Invalidate(ctx, members...)
}

func (s *feedService) cacheKey(ctx context.Context, user string, f *model.ContestFeedFilter) (string, error) {
	gen := "0"
	if s.cache != nil {
		if raw, ok, err := s.cache.Get(ctx, generationKey(user)); err == nil && ok {
			gen = string(raw)
		}
	}

	filter, err := json.Marshal(f)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(filter)
	return "feed:" + user + ":" + gen + ":" + hex.EncodeToString(sum[:12]), nil
}

func generationKey(user string) string {
	return "feed-generation:" + user
}
