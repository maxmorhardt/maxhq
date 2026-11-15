package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type RecapEmailRepository interface {
	CreateAll(ctx context.Context, emails []model.RecapEmail) error
	ClaimDue(ctx context.Context, now, leaseUntil time.Time, limit int) ([]model.RecapEmail, error)
	Finish(ctx context.Context, ids []uuid.UUID, status model.RecapEmailStatus, reason string, at time.Time) error
	Reschedule(ctx context.Context, id uuid.UUID, reason string, next time.Time) error
	ExpirePending(ctx context.Context, createdBefore time.Time, reason string) (int64, error)
	PruneFinished(ctx context.Context, updatedBefore time.Time) (int64, error)
	OldestPending(ctx context.Context) (*time.Time, error)
}

type recapEmailRepository struct {
	db *gorm.DB
}

func NewRecapEmailRepository(db *gorm.DB) RecapEmailRepository {
	return &recapEmailRepository{db: db}
}

func (r *recapEmailRepository) CreateAll(ctx context.Context, emails []model.RecapEmail) error {
	if len(emails) == 0 {
		return nil
	}
	return database.Conn(ctx, r.db).
		Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "contest_id"}, {Name: "user_id"}}, DoNothing: true}).
		Create(&emails).Error
}

func (r *recapEmailRepository) ClaimDue(ctx context.Context, now, leaseUntil time.Time, limit int) ([]model.RecapEmail, error) {
	var claimed []model.RecapEmail
	err := database.Conn(ctx, r.db).Raw(`
		UPDATE recap_emails SET attempts = attempts + 1, next_attempt_at = ?, updated_at = ?
		WHERE id IN (
			SELECT id FROM recap_emails
			WHERE status = ? AND next_attempt_at <= ?
			ORDER BY next_attempt_at
			LIMIT ?
			FOR UPDATE SKIP LOCKED
		)
		RETURNING *`,
		leaseUntil, now, model.RecapEmailPending, now, limit,
	).Scan(&claimed).Error
	return claimed, err
}

func (r *recapEmailRepository) Finish(ctx context.Context, ids []uuid.UUID, status model.RecapEmailStatus, reason string, at time.Time) error {
	if len(ids) == 0 {
		return nil
	}
	fields := map[string]any{"status": status, "last_error": reason, "updated_at": at}
	if status == model.RecapEmailSent || status == model.RecapEmailUnconfirmed {
		fields["sent_at"] = at
	}
	return database.Conn(ctx, r.db).Model(&model.RecapEmail{}).Where("id IN ?", ids).Updates(fields).Error
}

func (r *recapEmailRepository) Reschedule(ctx context.Context, id uuid.UUID, reason string, next time.Time) error {
	return database.Conn(ctx, r.db).Model(&model.RecapEmail{}).Where("id = ?", id).
		Updates(map[string]any{"last_error": reason, "next_attempt_at": next, "updated_at": time.Now()}).Error
}

func (r *recapEmailRepository) ExpirePending(ctx context.Context, createdBefore time.Time, reason string) (int64, error) {
	res := database.Conn(ctx, r.db).Model(&model.RecapEmail{}).
		Where("status = ? AND created_at < ?", model.RecapEmailPending, createdBefore).
		Updates(map[string]any{"status": model.RecapEmailSkipped, "last_error": reason, "updated_at": time.Now()})
	return res.RowsAffected, res.Error
}

func (r *recapEmailRepository) PruneFinished(ctx context.Context, updatedBefore time.Time) (int64, error) {
	res := database.Conn(ctx, r.db).
		Where("status <> ? AND updated_at < ?", model.RecapEmailPending, updatedBefore).
		Delete(&model.RecapEmail{})
	return res.RowsAffected, res.Error
}

func (r *recapEmailRepository) OldestPending(ctx context.Context) (*time.Time, error) {
	var oldest sql.NullTime
	err := database.Conn(ctx, r.db).Model(&model.RecapEmail{}).
		Select("MIN(created_at)").Where("status = ?", model.RecapEmailPending).
		Scan(&oldest).Error
	if err != nil || !oldest.Valid {
		return nil, err
	}
	return &oldest.Time, nil
}
