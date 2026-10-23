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

type SquareRepository interface {
	CountByOwner(ctx context.Context, contestID uuid.UUID, owner string) (int, error)

	Claim(ctx context.Context, square *model.Square, value, owner, ownerName string) (*model.Square, error)
	ClaimRandom(ctx context.Context, contestID uuid.UUID, count int, value, owner, ownerName string) ([]model.Square, error)
	Clear(ctx context.Context, square *model.Square) (*model.Square, error)
	Ghost(ctx context.Context, square *model.Square) (*model.Square, error)
	ClearByOwner(ctx context.Context, contestID uuid.UUID, owner string) ([]model.Square, error)
	UpdateInitials(ctx context.Context, owner, initials string) ([]model.Square, error)
}

type squareRepository struct {
	db *gorm.DB
}

func NewSquareRepository(db *gorm.DB) SquareRepository {
	return &squareRepository{db: db}
}

// squares only change while the contest is ACTIVE; the shared lock blocks a concurrent start until this edit commits
func lockActiveContest(tx *gorm.DB, contestID uuid.UUID) error {
	var contest model.Contest
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).
		Select("id", "status").
		First(&contest, "id = ?", contestID).Error; err != nil {
		return err
	}

	if contest.Status != model.ContestStatusActive {
		return errs.ErrSquareNotEditable
	}

	return nil
}

func reloadSquare(tx *gorm.DB, square *model.Square) error {
	return tx.First(square, "id = ?", square.ID).Error
}

func (r *squareRepository) Claim(ctx context.Context, square *model.Square, value, owner, ownerName string) (*model.Square, error) {
	err := database.InTx(ctx, func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, square.ContestID); err != nil {
			return err
		}

		// lock the participant row so this user's concurrent claims serialize and the limit below holds
		var participant model.ContestParticipant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("contest_id = ? AND user_id = ?", square.ContestID, owner).
			First(&participant).Error; err != nil {
			return err
		}

		res := tx.Model(&model.Square{}).
			Where("id = ? AND (owner = ? OR owner = ?)", square.ID, "", owner).
			Updates(map[string]any{
				"value":      value,
				"owner":      owner,
				"owner_name": ownerName,
				"updated_by": owner,
				"claimed_at": time.Now(),
				"version":    gorm.Expr("version + 1"),
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errs.ErrSquareTaken
		}

		// count after the write so the new claim is included, then roll back if it broke the limit
		var claimed int64
		if err := tx.Model(&model.Square{}).
			Where("contest_id = ? AND owner = ? AND value != ?", square.ContestID, owner, "").
			Count(&claimed).Error; err != nil {
			return err
		}
		if claimed > int64(participant.MaxSquares) {
			return errs.ErrSquareLimitReached
		}

		return reloadSquare(tx, square)
	})
	if err != nil {
		return nil, err
	}

	return square, nil
}

// SKIP LOCKED lets concurrent fills take different squares instead of waiting on or colliding with each other
func (r *squareRepository) ClaimRandom(ctx context.Context, contestID uuid.UUID, count int, value, owner, ownerName string) ([]model.Square, error) {
	var claimed []model.Square
	err := database.InTx(ctx, func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, contestID); err != nil {
			return err
		}

		var participant model.ContestParticipant
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("contest_id = ? AND user_id = ?", contestID, owner).
			First(&participant).Error; err != nil {
			return err
		}

		var held int64
		if err := tx.Model(&model.Square{}).
			Where("contest_id = ? AND owner = ? AND value != ?", contestID, owner, "").
			Count(&held).Error; err != nil {
			return err
		}
		remaining := participant.MaxSquares - int(held)
		if remaining <= 0 {
			return errs.ErrSquareLimitReached
		}
		count = min(count, remaining)

		var ids []uuid.UUID
		if err := tx.Raw(
			`SELECT id FROM squares WHERE contest_id = ? AND owner = '' AND value = '' ORDER BY random() LIMIT ? FOR UPDATE SKIP LOCKED`,
			contestID, count,
		).Scan(&ids).Error; err != nil {
			return err
		}
		if len(ids) == 0 {
			return errs.ErrNoEmptySquares
		}

		if err := tx.Model(&model.Square{}).
			Where("id IN ?", ids).
			Updates(map[string]any{
				"value":      value,
				"owner":      owner,
				"owner_name": ownerName,
				"updated_by": owner,
				"claimed_at": time.Now(),
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		return tx.Where("id IN ?", ids).Order("\"row\", col").Find(&claimed).Error
	})

	return claimed, err
}

func (r *squareRepository) Clear(ctx context.Context, square *model.Square) (*model.Square, error) {
	err := database.InTx(ctx, func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, square.ContestID); err != nil {
			return err
		}

		if err := tx.Model(&model.Square{}).
			Where("id = ?", square.ID).
			Updates(map[string]any{
				"value":      "",
				"owner":      "",
				"owner_name": "",
				"claimed_at": nil,
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		return reloadSquare(tx, square)
	})
	if err != nil {
		return nil, err
	}

	return square, nil
}

// in-progress squares keep their value so scoring is unaffected; only the owner identity is dropped
func (r *squareRepository) Ghost(ctx context.Context, square *model.Square) (*model.Square, error) {
	err := database.InTx(ctx, func(tx *gorm.DB) error {
		if err := tx.Model(&model.Square{}).
			Where("id = ?", square.ID).
			Updates(map[string]any{
				"owner":      model.GhostUser,
				"owner_name": "",
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		return reloadSquare(tx, square)
	})
	if err != nil {
		return nil, err
	}

	return square, nil
}

func (r *squareRepository) ClearByOwner(ctx context.Context, contestID uuid.UUID, owner string) ([]model.Square, error) {
	var clearedSquares []model.Square
	err := database.InTx(ctx, func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, contestID); err != nil {
			return err
		}

		var ids []uuid.UUID
		if err := tx.Model(&model.Square{}).
			Where("contest_id = ? AND owner = ?", contestID, owner).
			Pluck("id", &ids).Error; err != nil {
			return err
		}
		if len(ids) == 0 {
			return nil
		}

		if err := tx.Model(&model.Square{}).
			Where("id IN ?", ids).
			Updates(map[string]any{
				"value":      "",
				"owner":      "",
				"owner_name": "",
				"claimed_at": nil,
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		return tx.Where("id IN ?", ids).Order("\"row\", col").Find(&clearedSquares).Error
	})

	return clearedSquares, err
}

func (r *squareRepository) CountByOwner(ctx context.Context, contestID uuid.UUID, owner string) (int, error) {
	var count int64
	err := database.Conn(ctx, r.db).
		Model(&model.Square{}).
		Where("contest_id = ? AND owner = ? AND value != ''", contestID, owner).
		Count(&count).Error
	return int(count), err
}

func (r *squareRepository) UpdateInitials(ctx context.Context, owner, initials string) ([]model.Square, error) {
	var squares []model.Square

	err := database.InTx(ctx, func(tx *gorm.DB) error {
		liveContests := tx.Model(&model.Contest{}).Select("id").Where("status NOT IN ?", terminalStatuses)

		if err := tx.Model(&model.Square{}).
			Where("owner = ? AND value != ? AND contest_id IN (?)", owner, "", liveContests).
			Updates(map[string]any{"value": initials, "version": gorm.Expr("version + 1")}).Error; err != nil {
			return err
		}

		return tx.Where("owner = ? AND value != ? AND contest_id IN (?)", owner, "", liveContests).
			Find(&squares).Error
	})
	if err != nil {
		return nil, err
	}

	return squares, nil
}
