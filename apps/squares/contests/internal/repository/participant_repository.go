package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"gorm.io/gorm"
)

type ParticipantRepository interface {
	GetByContestAndUser(ctx context.Context, contestID uuid.UUID, userID string) (*model.ContestParticipant, error)
	GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error)
	GetTotalAllocatedSquares(ctx context.Context, contestID uuid.UUID) (int, error)
	CountSquaresByUser(ctx context.Context, contestID uuid.UUID, userID string) (int, error)
	Update(ctx context.Context, participant *model.ContestParticipant) error
	Delete(ctx context.Context, contestID uuid.UUID, userID string) error
}

type participantRepository struct {
	db *gorm.DB
}

func NewParticipantRepository(db *gorm.DB) ParticipantRepository {
	return &participantRepository{
		db: db,
	}
}

func (r *participantRepository) GetByContestAndUser(ctx context.Context, contestID uuid.UUID, userID string) (*model.ContestParticipant, error) {
	var participant model.ContestParticipant
	err := database.Conn(ctx, r.db).
		Where("contest_id = ? AND user_id = ?", contestID, userID).
		First(&participant).Error
	return &participant, err
}

func (r *participantRepository) GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error) {
	var participants []model.ContestParticipant
	err := database.Conn(ctx, r.db).
		Select("contest_participants.*, COALESCE(users.display_name, '') AS display_name").
		Joins("LEFT JOIN users ON users.email = contest_participants.user_id").
		Where("contest_participants.contest_id = ?", contestID).
		Order("contest_participants.joined_at ASC").
		Find(&participants).Error
	return participants, err
}

func (r *participantRepository) GetTotalAllocatedSquares(ctx context.Context, contestID uuid.UUID) (int, error) {
	var total int
	err := database.Conn(ctx, r.db).
		Model(&model.ContestParticipant{}).
		Where("contest_id = ?", contestID).
		Select("COALESCE(SUM(max_squares), 0)").
		Row().
		Scan(&total)
	return total, err
}

func (r *participantRepository) CountSquaresByUser(ctx context.Context, contestID uuid.UUID, userID string) (int, error) {
	var count int64
	err := database.Conn(ctx, r.db).
		Model(&model.Square{}).
		Where("contest_id = ? AND owner = ? AND value != ''", contestID, userID).
		Count(&count).Error
	return int(count), err
}

func (r *participantRepository) Update(ctx context.Context, participant *model.ContestParticipant) error {
	return database.Conn(ctx, r.db).Save(participant).Error
}

func (r *participantRepository) Delete(ctx context.Context, contestID uuid.UUID, userID string) error {
	return database.Conn(ctx, r.db).
		Where("contest_id = ? AND user_id = ?", contestID, userID).
		Delete(&model.ContestParticipant{}).Error
}
