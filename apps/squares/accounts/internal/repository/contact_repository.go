package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"gorm.io/gorm"
)

type ContactRepository interface {
	Create(ctx context.Context, submission *model.ContactSubmission) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.ContactSubmission, error)
}

type contactRepository struct {
	db *gorm.DB
}

func NewContactRepository(db *gorm.DB) ContactRepository {
	return &contactRepository{
		db: db,
	}
}

func (r *contactRepository) Create(ctx context.Context, submission *model.ContactSubmission) error {
	return database.Conn(ctx, r.db).Create(submission).Error
}

func (r *contactRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ContactSubmission, error) {
	var submission model.ContactSubmission
	err := database.Conn(ctx, r.db).First(&submission, "id = ?", id).Error
	return &submission, err
}
