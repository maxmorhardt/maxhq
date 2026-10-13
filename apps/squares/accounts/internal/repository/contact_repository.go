package repository

import (
	"context"

	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/database"
	"gorm.io/gorm"
)

type ContactRepository interface {
	Create(ctx context.Context, submission *model.ContactSubmission) error
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
