package service

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

const (
	leaderboardCacheTTL = 60 * time.Second

	DefaultLeaderboardLimit = 10
	MaxLeaderboardLimit     = 100

	anonymousPlayer = "Player"
)

type LeaderboardService interface {
	GetLeaderboard(ctx context.Context, limit int) (*model.LeaderboardResponse, error)
	GetUserRank(ctx context.Context, email string) (*model.LeaderboardRankResponse, error)
}

type leaderboardService struct {
	repo  repository.LeaderboardRepository
	cache cache.Cache
}

// the cache is shared by every replica, so a leaderboard computed once serves all of them for the ttl
func NewLeaderboardService(repo repository.LeaderboardRepository, c cache.Cache) LeaderboardService {
	return &leaderboardService{
		repo:  repo,
		cache: c,
	}
}

func (s *leaderboardService) GetLeaderboard(ctx context.Context, limit int) (*model.LeaderboardResponse, error) {
	log := util.LoggerFromContext(ctx)

	if limit <= 0 {
		limit = DefaultLeaderboardLimit
	}
	if limit > MaxLeaderboardLimit {
		limit = MaxLeaderboardLimit
	}

	leaderboard, err := cache.GetOrLoad(ctx, s.cache, "leaderboard", strconv.Itoa(limit), leaderboardCacheTTL, func(ctx context.Context) (*model.LeaderboardResponse, error) {
		entries, err := s.repo.GetTopWinners(ctx, limit)
		if err != nil {
			return nil, err
		}

		return &model.LeaderboardResponse{Entries: assignRanks(entries)}, nil
	})
	if err != nil {
		log.Error("failed to get leaderboard", "error", err)
		return nil, err
	}

	return leaderboard, nil
}

func assignRanks(entries []model.LeaderboardEntry) []model.LeaderboardEntry {
	for i := range entries {
		entries[i].DisplayName = publicName(entries[i].DisplayName)

		if i > 0 && entries[i].QuarterWins == entries[i-1].QuarterWins {
			entries[i].Rank = entries[i-1].Rank
			continue
		}

		entries[i].Rank = i + 1
	}

	return entries
}

func publicName(displayName string) string {
	// a display name defaults to the email when the provider sends no name claim
	if at := strings.Index(displayName, "@"); at >= 0 {
		displayName = displayName[:at]
	}

	parts := strings.Fields(displayName)
	if len(parts) == 0 {
		return anonymousPlayer
	}

	first := parts[0]
	if len(parts) == 1 {
		return first
	}

	last := []rune(parts[len(parts)-1])

	return first + " " + strings.ToUpper(string(last[0])) + "."
}

func (s *leaderboardService) GetUserRank(ctx context.Context, email string) (*model.LeaderboardRankResponse, error) {
	log := util.LoggerFromContext(ctx)

	rank, err := s.repo.GetUserRank(ctx, email)
	if err != nil {
		log.Error("failed to get user rank", "error", err)
		return nil, err
	}

	return rank, nil
}
