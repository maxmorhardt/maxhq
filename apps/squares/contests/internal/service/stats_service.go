package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

const statsCacheTTL = 30 * time.Second

type StatsService interface {
	GetStats(ctx context.Context) (*model.StatsResponse, error)
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

func (s *statsService) GetStats(ctx context.Context) (*model.StatsResponse, error) {
	log := logging.FromContext(ctx)

	stats, err := cache.GetOrLoad(ctx, s.cache, "stats", "global", statsCacheTTL, s.repo.GetStats)
	if err != nil {
		log.Error("failed to get stats", "error", err)
		return nil, err
	}

	return stats, nil
}
