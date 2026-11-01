package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type InviteRepository interface {
	GetByToken(ctx context.Context, token string) (*model.ContestInvite, error)
	CountByContestID(ctx context.Context, contestID uuid.UUID, since time.Time) (model.CreationCounts, error)
	GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestInvite, error)
	Create(ctx context.Context, invite *model.ContestInvite) error
	RedeemInvite(ctx context.Context, inviteID uuid.UUID, participant *model.ContestParticipant, maxPoolSquares int) error
	Delete(ctx context.Context, contestID, id uuid.UUID) error
}

type inviteRepository struct {
	db *gorm.DB
}

func NewInviteRepository(db *gorm.DB) InviteRepository {
	return &inviteRepository{
		db: db,
	}
}

func (r *inviteRepository) GetByToken(ctx context.Context, token string) (*model.ContestInvite, error) {
	var invite model.ContestInvite
	err := database.Conn(ctx, r.db).Where("token = ?", token).First(&invite).Error
	return &invite, database.TranslateError(err)
}

func (r *inviteRepository) GetAllByContestID(ctx context.Context, contestID uuid.UUID) ([]model.ContestInvite, error) {
	var invites []model.ContestInvite
	err := database.Conn(ctx, r.db).Where("contest_id = ?", contestID).Order("created_at DESC").Find(&invites).Error
	return invites, err
}

func (r *inviteRepository) CountByContestID(ctx context.Context, contestID uuid.UUID, since time.Time) (model.CreationCounts, error) {
	var counts model.CreationCounts
	err := database.Conn(ctx, r.db).
		Model(&model.ContestInvite{}).
		Select(`COUNT(*) FILTER (WHERE (expires_at IS NULL OR expires_at > ?) AND (max_uses = 0 OR uses < max_uses)) AS open,
			COUNT(*) FILTER (WHERE created_at > ?) AS recent`, time.Now(), since).
		Where("contest_id = ?", contestID).
		Scan(&counts).Error
	return counts, err
}

func (r *inviteRepository) Create(ctx context.Context, invite *model.ContestInvite) error {
	return database.Conn(ctx, r.db).Create(invite).Error
}

func (r *inviteRepository) RedeemInvite(ctx context.Context, inviteID uuid.UUID, participant *model.ContestParticipant, maxPoolSquares int) error {
	return database.InTx(ctx, func(tx *gorm.DB) error {
		// lock the contest so concurrent redemptions cannot both pass the pool check below
		var contest model.Contest
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Select("id").
			Where("id = ?", participant.ContestID).
			First(&contest).Error; err != nil {
			return err
		}

		var allocated int64
		if err := tx.Model(&model.ContestParticipant{}).
			Where("contest_id = ?", participant.ContestID).
			Select("COALESCE(SUM(max_squares), 0)").
			Row().
			Scan(&allocated); err != nil {
			return err
		}
		if allocated+int64(participant.MaxSquares) > int64(maxPoolSquares) {
			return errs.ErrNotEnoughSquares
		}

		// the unique index on (contest_id, user_id) turns a duplicate join into database.ErrDuplicate
		if err := tx.Create(participant).Error; err != nil {
			return err
		}

		// consume a use only while one is left, so max_uses cannot be exceeded by racing redemptions
		result := tx.Model(&model.ContestInvite{}).
			Where("id = ? AND (max_uses = ? OR uses < max_uses)", inviteID, 0).
			UpdateColumn("uses", gorm.Expr("uses + 1"))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errs.ErrInviteMaxUsesReached
		}

		return nil
	})
}

func (r *inviteRepository) Delete(ctx context.Context, contestID, id uuid.UUID) error {
	return database.Conn(ctx, r.db).Where("id = ? AND contest_id = ?", id, contestID).Delete(&model.ContestInvite{}).Error
}
