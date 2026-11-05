package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BanRepository interface {
	Exists(ctx context.Context, contestID uuid.UUID, userID string) (bool, error)
	GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestBan, error)
	Create(ctx context.Context, ban *model.ContestBan) error
	Delete(ctx context.Context, contestID uuid.UUID, userID string) error
}

type banRepository struct {
	db *gorm.DB
}

func NewBanRepository(db *gorm.DB) BanRepository {
	return &banRepository{
		db: db,
	}
}

func (r *banRepository) Exists(ctx context.Context, contestID uuid.UUID, userID string) (bool, error) {
	var count int64
	err := database.Conn(ctx, r.db).
		Model(&model.ContestBan{}).
		Where("contest_id = ? AND user_id = ?", contestID, userID).
		Count(&count).Error
	return count > 0, err
}

func (r *banRepository) GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestBan, error) {
	var bans []model.ContestBan
	err := database.Conn(ctx, r.db).
		Select("contest_bans.*, COALESCE(users.display_name, '') AS display_name").
		Joins("LEFT JOIN users ON users.email = contest_bans.user_id").
		Where("contest_bans.contest_id = ?", contestID).
		Order("contest_bans.created_at DESC").
		Find(&bans).Error
	return bans, err
}

func (r *banRepository) Create(ctx context.Context, ban *model.ContestBan) error {
	return database.Conn(ctx, r.db).Clauses(clause.OnConflict{DoNothing: true}).Create(ban).Error
}

func (r *banRepository) Delete(ctx context.Context, contestID uuid.UUID, userID string) error {
	return database.Conn(ctx, r.db).
		Where("contest_id = ? AND user_id = ?", contestID, userID).
		Delete(&model.ContestBan{}).Error
}
