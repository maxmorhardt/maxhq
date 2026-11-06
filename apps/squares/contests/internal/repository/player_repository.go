package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PlayerRepository interface {
	GetByContestAndUser(ctx context.Context, contestID uuid.UUID, userID string) (*model.ContestPlayer, error)
	GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, error)
	SetMaxSquares(ctx context.Context, contestID uuid.UUID, ids []uuid.UUID, maxSquares int, at time.Time) ([]uuid.UUID, error)
	Create(ctx context.Context, player *model.ContestPlayer) error
	Update(ctx context.Context, player *model.ContestPlayer) error
	Delete(ctx context.Context, contestID uuid.UUID, userID string) error
}

type playerRepository struct {
	db *gorm.DB
}

func NewPlayerRepository(db *gorm.DB) PlayerRepository {
	return &playerRepository{
		db: db,
	}
}

func (r *playerRepository) GetByContestAndUser(ctx context.Context, contestID uuid.UUID, userID string) (*model.ContestPlayer, error) {
	var player model.ContestPlayer
	err := database.Conn(ctx, r.db).
		Select("contest_players.*, COALESCE(users.display_name, '') AS display_name").
		Joins("LEFT JOIN users ON users.email = contest_players.user_id").
		Where("contest_players.contest_id = ? AND contest_players.user_id = ?", contestID, userID).
		First(&player).Error
	return &player, database.TranslateError(err)
}

func (r *playerRepository) GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, error) {
	var players []model.ContestPlayer
	err := database.Conn(ctx, r.db).
		Select("contest_players.*, COALESCE(users.display_name, '') AS display_name").
		Joins("LEFT JOIN users ON users.email = contest_players.user_id").
		Where("contest_players.contest_id = ?", contestID).
		Order("contest_players.joined_at ASC").
		Find(&players).Error
	return players, err
}

func (r *playerRepository) SetMaxSquares(ctx context.Context, contestID uuid.UUID, ids []uuid.UUID, maxSquares int, at time.Time) ([]uuid.UUID, error) {
	var updated []model.ContestPlayer
	err := database.Conn(ctx, r.db).
		Model(&updated).
		Clauses(clause.Returning{Columns: []clause.Column{{Name: "id"}}}).
		Where("contest_id = ? AND id IN ? AND max_squares = 0", contestID, ids).
		Updates(map[string]any{"max_squares": maxSquares, "updated_at": at}).Error
	if err != nil {
		return nil, database.TranslateError(err)
	}

	updatedIDs := make([]uuid.UUID, 0, len(updated))
	for i := range updated {
		updatedIDs = append(updatedIDs, updated[i].ID)
	}
	return updatedIDs, nil
}

func (r *playerRepository) Create(ctx context.Context, player *model.ContestPlayer) error {
	return database.TranslateError(database.Conn(ctx, r.db).Create(player).Error)
}

func (r *playerRepository) Update(ctx context.Context, player *model.ContestPlayer) error {
	return database.Conn(ctx, r.db).Save(player).Error
}

func (r *playerRepository) Delete(ctx context.Context, contestID uuid.UUID, userID string) error {
	return database.Conn(ctx, r.db).
		Where("contest_id = ? AND user_id = ?", contestID, userID).
		Delete(&model.ContestPlayer{}).Error
}
