package repository

import (
	"context"
	"database/sql"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"gorm.io/gorm"
)

type StatsRepository interface {
	GetStats(ctx context.Context) (*model.StatsResponse, error)
}

type statsRepository struct {
	db *gorm.DB
}

func NewStatsRepository(db *gorm.DB) StatsRepository {
	return &statsRepository{
		db: db,
	}
}

func (r *statsRepository) GetStats(ctx context.Context) (*model.StatsResponse, error) {
	var stats model.StatsResponse
	err := database.Conn(ctx, r.db).Raw(`
		SELECT
			(SELECT COUNT(*) FROM contests WHERE created_at >= CURRENT_DATE AND status <> @deleted) AS contests_created_today,
			(SELECT COUNT(*) FROM squares s JOIN contests c ON c.id = s.contest_id AND c.status <> @deleted
				WHERE s.owner <> '' AND s.updated_at >= CURRENT_DATE) AS squares_claimed_today,
			(SELECT COUNT(*) FROM contests WHERE status NOT IN (@deleted, @finished)) AS total_active_contests`,
		sql.Named("deleted", model.ContestStatusDeleted), sql.Named("finished", model.ContestStatusFinished),
	).Scan(&stats).Error
	if err != nil {
		return nil, err
	}
	return &stats, nil
}
