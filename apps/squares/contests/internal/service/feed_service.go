package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

const (
	feedCacheTTL      = 2 * time.Minute
	feedGenerationTTL = time.Hour
	// longer than any replica lag, so a reload right after a write sees it
	feedFreshWindow = 10 * time.Second
)

type FeedService interface {
	List(ctx context.Context, user string, f *model.ContestFeedFilter) (*model.ContestFeedResponse, error)
	Members(ctx context.Context, contestID uuid.UUID) []string
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
	key, gen, err := s.cacheKey(ctx, user, f)
	if err != nil {
		return nil, err
	}

	return cache.GetOrLoad(ctx, s.cache, "contest_feed", key, feedCacheTTL, func(ctx context.Context) (*model.ContestFeedResponse, error) {
		// a replica that hasn't applied the write would cache the old list under the new generation
		if s.invalidatedRecently(gen) {
			ctx = database.ReadPrimary(ctx)
		}

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
			resp.NextCursor = model.FeedCursor{At: last.UpdatedAt, ID: last.ID}.Encode()
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

func (s *feedService) Members(ctx context.Context, contestID uuid.UUID) []string {
	if s.cache == nil {
		return nil
	}

	// a lagging replica would miss someone who just joined
	members, err := s.repo.Members(database.ReadPrimary(ctx), contestID)
	if err != nil {
		logging.FromContext(ctx).Warn("failed to load contest members for feed invalidation", "contest_id", contestID, "error", err)
		return nil
	}
	return members
}

func (s *feedService) InvalidateContest(ctx context.Context, contestID uuid.UUID) {
	s.Invalidate(ctx, s.Members(ctx, contestID)...)
}

func (s *feedService) cacheKey(ctx context.Context, user string, f *model.ContestFeedFilter) (key, gen string, err error) {
	gen = "0"
	if s.cache != nil {
		if raw, ok, getErr := s.cache.Get(ctx, generationKey(user)); getErr == nil && ok {
			gen = string(raw)
		}
	}

	filter, err := json.Marshal(f)
	if err != nil {
		return "", "", err
	}
	sum := sha256.Sum256(filter)
	return "feed:" + user + ":" + gen + ":" + hex.EncodeToString(sum[:12]), gen, nil
}

// the generation is the time of the user's last invalidation
func (s *feedService) invalidatedRecently(gen string) bool {
	at, err := strconv.ParseInt(gen, 10, 64)
	return err == nil && s.now().Sub(time.Unix(0, at)) < feedFreshWindow
}

func generationKey(user string) string {
	return "feed-generation:" + user
}
