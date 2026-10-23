package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/squares/contracts"
	"gorm.io/gorm"
)

type StatsRepository interface {
	GetSiteStats(ctx context.Context) (*model.StatsResponse, error)
	GetUserStats(ctx context.Context, email string) (*model.UserStatsResponse, error)
	GetActiveContests(ctx context.Context, email string) ([]contracts.UserActiveContest, error)
	GetFirstActivity(ctx context.Context, email string) (*time.Time, error)
}

type statsRepository struct {
	db *gorm.DB
}

func NewStatsRepository(db *gorm.DB) StatsRepository {
	return &statsRepository{
		db: db,
	}
}

func (r *statsRepository) GetSiteStats(ctx context.Context) (*model.StatsResponse, error) {
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

func (r *statsRepository) GetUserStats(ctx context.Context, email string) (*model.UserStatsResponse, error) {
	var stats model.UserStatsResponse
	err := database.Conn(ctx, r.db).Raw(`
		SELECT
			(SELECT COUNT(*) FROM contests WHERE owner = @email AND status <> @deleted) AS contests_created,
			(SELECT COUNT(*) FROM contest_participants p JOIN contests c ON c.id = p.contest_id
				WHERE p.user_id = @email AND c.status <> @deleted) AS contests_joined,
			(SELECT COUNT(*) FROM squares s JOIN contests c ON c.id = s.contest_id
				WHERE s.owner = @email AND c.status <> @deleted) AS squares_claimed,
			(SELECT COUNT(*) FROM quarter_results q JOIN contests c ON c.id = q.contest_id
				WHERE q.winner = @email AND c.status <> @deleted) AS quarter_wins,
			(SELECT COUNT(*) FROM quarter_results q JOIN contests c ON c.id = q.contest_id
				WHERE c.status <> @deleted
				AND EXISTS (SELECT 1 FROM squares s WHERE s.contest_id = q.contest_id AND s.owner = @email)) AS quarters_played`,
		sql.Named("deleted", model.ContestStatusDeleted), sql.Named("email", email),
	).Scan(&stats).Error
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *statsRepository) GetActiveContests(ctx context.Context, email string) ([]contracts.UserActiveContest, error) {
	var contests []contracts.UserActiveContest

	if err := database.Conn(ctx, r.db).Raw(
		`SELECT c.id, c.name, c.owner, CASE WHEN c.owner = ? THEN 'owner' ELSE 'participant' END AS role
		FROM contests c
		WHERE c.status NOT IN ?
		AND (c.owner = ? OR c.id IN (SELECT contest_id FROM contest_participants WHERE user_id = ?))
		ORDER BY c.created_at`,
		email, terminalStatuses, email, email).
		Scan(&contests).Error; err != nil {
		return nil, err
	}

	return contests, nil
}

func (r *statsRepository) GetFirstActivity(ctx context.Context, email string) (*time.Time, error) {
	var firstActivity sql.NullTime
	if err := database.Conn(ctx, r.db).Raw(
		`SELECT MIN(t) FROM (
			SELECT MIN(created_at) AS t FROM contests WHERE owner = ?
			UNION ALL
			SELECT MIN(joined_at) FROM contest_participants WHERE user_id = ?
		) activity`, email, email).Scan(&firstActivity).Error; err != nil {
		return nil, err
	}

	if !firstActivity.Valid {
		return nil, nil
	}

	return &firstActivity.Time, nil
}
