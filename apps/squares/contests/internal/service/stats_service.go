package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/squares/contracts"
)

const statsCacheTTL = 30 * time.Second

type StatsService interface {
	GetSiteStats(ctx context.Context) (*model.StatsResponse, error)
	GetUserStats(ctx context.Context, email string) (*model.UserStatsResponse, error)
	GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error)
}

type statsService struct {
	repo  repository.StatsRepository
	cache cache.Cache
}

func NewStatsService(repo repository.StatsRepository, c cache.Cache) StatsService {
	return &statsService{
		repo:  repo,
		cache: c,
	}
}

func (s *statsService) GetSiteStats(ctx context.Context) (*model.StatsResponse, error) {
	log := logging.FromContext(ctx)

	stats, err := cache.GetOrLoad(ctx, s.cache, "stats", "global", statsCacheTTL, s.repo.GetSiteStats)
	if err != nil {
		log.Error("failed to get stats", "error", err)
		return nil, err
	}

	return stats, nil
}

func (s *statsService) GetUserStats(ctx context.Context, email string) (*model.UserStatsResponse, error) {
	log := logging.FromContext(ctx)

	stats, err := s.repo.GetUserStats(ctx, email)
	if err != nil {
		log.Error("failed to get user stats", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved user stats")
	return stats, nil
}

func (s *statsService) GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error) {
	log := logging.FromContext(ctx)

	active, err := s.repo.GetActiveContests(ctx, email)
	if err != nil {
		log.Error("failed to list active contests for activity summary", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	first, err := s.repo.GetFirstActivity(ctx, email)
	if err != nil {
		log.Error("failed to get first activity", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if active == nil {
		active = []contracts.UserActiveContest{}
	}

	return &contracts.UserActivitySummary{ActiveContests: active, FirstActivity: first}, nil
}
