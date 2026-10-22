package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
)

type FeedRepository interface {
	List(ctx context.Context, user string, f *model.ContestFeedFilter) ([]model.ContestSummary, error)
	Members(ctx context.Context, contestID uuid.UUID) ([]string, error)
}

type feedRepository struct {
	db *gorm.DB
}

func NewFeedRepository(db *gorm.DB) FeedRepository {
	return &feedRepository{db: db}
}

// owners are matched on contests.owner too, since older contests may lack an owner participant row
func (r *feedRepository) List(ctx context.Context, user string, f *model.ContestFeedFilter) ([]model.ContestSummary, error) {
	q := database.Conn(ctx, r.db).
		Table("contests c").
		Select(`c.id, c.name, c.home_team, c.away_team, c.status, c.visibility, c.owner, c.game_id, c.version,
			c.created_at, c.updated_at, g.game_time, g.home_abbr, g.away_abbr,
			CASE WHEN c.owner = ? THEN 'owner' ELSE cp.role END AS role,
			(SELECT count(*) FROM squares s WHERE s.contest_id = c.id AND s.owner <> '') AS claimed_squares,
			(SELECT count(*) FROM squares s WHERE s.contest_id = c.id AND s.owner = ?) AS my_squares`, user, user).
		Joins("LEFT JOIN contest_participants cp ON cp.contest_id = c.id AND cp.user_id = ?", user).
		Joins("LEFT JOIN games g ON g.id = c.game_id").
		Where("c.status <> ?", model.ContestStatusDeleted)

	switch f.Role {
	case model.FeedRoleOwned:
		q = q.Where("c.owner = ?", user)
	case model.FeedRoleJoined:
		q = q.Where("c.owner <> ? AND cp.id IS NOT NULL", user)
	default:
		q = q.Where("(c.owner = ? OR cp.id IS NOT NULL)", user)
	}

	if len(f.Statuses) > 0 {
		q = q.Where("c.status IN ?", f.Statuses)
	}
	if f.Search != "" {
		q = q.Where("c.name ILIKE ?", "%"+f.Search+"%")
	}
	if f.Cursor != nil {
		q = q.Where("(c.updated_at, c.id) < (?, ?)", f.Cursor.At, f.Cursor.ID)
	}

	var rows []model.ContestSummary
	err := q.Order("c.updated_at DESC").Order("c.id DESC").Limit(f.Limit).Scan(&rows).Error
	return rows, err
}

func (r *feedRepository) Members(ctx context.Context, contestID uuid.UUID) ([]string, error) {
	var members []string
	err := database.Conn(ctx, r.db).Raw(
		"SELECT user_id FROM contest_participants WHERE contest_id = ? UNION SELECT owner FROM contests WHERE id = ?",
		contestID, contestID,
	).Scan(&members).Error
	return members, err
}
