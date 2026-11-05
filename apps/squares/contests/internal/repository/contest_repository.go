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

type ContestRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*model.Contest, error)
	GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*model.Contest, error)
	GetByInviteToken(ctx context.Context, token string) (*model.Contest, error)
	GetInviteToken(ctx context.Context, id uuid.UUID) (string, error)
	GetVisibilityByID(ctx context.Context, id uuid.UUID) (model.ContestVisibility, error)
	GetIDsByGameID(ctx context.Context, gameID uuid.UUID) ([]uuid.UUID, error)
	CountByOwner(ctx context.Context, owner string, since time.Time) (model.CreationCounts, error)

	Create(ctx context.Context, contest *model.Contest, owner *model.ContestPlayer) error
	Update(ctx context.Context, contest *model.Contest) error
	Delete(ctx context.Context, id uuid.UUID) error
	ResetInviteToken(ctx context.Context, id uuid.UUID) (string, error)
	ApplyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult) error
}

var terminalStatuses = []model.ContestStatus{model.ContestStatusFinished, model.ContestStatusDeleted}

type contestRepository struct {
	db *gorm.DB
}

func NewContestRepository(db *gorm.DB) ContestRepository {
	return &contestRepository{
		db: db,
	}
}

func (r *contestRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Contest, error) {
	return r.get(database.Conn(ctx, r.db), "id = ?", id)
}

// locks the contest row until the caller's transaction ends, so state checks and the write that follows cannot interleave with square edits
func (r *contestRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*model.Contest, error) {
	return r.get(database.Conn(ctx, r.db).Clauses(clause.Locking{Strength: "UPDATE"}), "id = ?", id)
}

func (r *contestRepository) GetByInviteToken(ctx context.Context, token string) (*model.Contest, error) {
	return r.get(database.Conn(ctx, r.db), "invite_token = ?", token)
}

func (r *contestRepository) GetInviteToken(ctx context.Context, id uuid.UUID) (string, error) {
	var contest model.Contest
	err := database.Conn(ctx, r.db).
		Select("invite_token").
		First(&contest, "id = ? AND status != ?", id, model.ContestStatusDeleted).Error
	return contest.InviteToken, database.TranslateError(err)
}

func (r *contestRepository) get(db *gorm.DB, query string, arg any) (*model.Contest, error) {
	var contest model.Contest
	err := db.
		Preload("Squares").
		Preload("QuarterResults", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		Preload("Game.Scores", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		Where(query, arg).
		First(&contest, "status != ?", model.ContestStatusDeleted).Error

	return &contest, database.TranslateError(err)
}

func (r *contestRepository) GetVisibilityByID(ctx context.Context, id uuid.UUID) (model.ContestVisibility, error) {
	var contest model.Contest
	err := database.Conn(ctx, r.db).
		Select("visibility").
		First(&contest, "id = ? AND status != ?", id, model.ContestStatusDeleted).Error
	return contest.Visibility, database.TranslateError(err)
}

// ids only: each contest is reloaded under its own lock before it is reconciled
func (r *contestRepository) GetIDsByGameID(ctx context.Context, gameID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Where("game_id = ? AND status NOT IN ?", gameID, []model.ContestStatus{model.ContestStatusDeleted, model.ContestStatusFinished}).
		Pluck("id", &ids).Error
	return ids, err
}

func (r *contestRepository) CountByOwner(ctx context.Context, owner string, since time.Time) (model.CreationCounts, error) {
	var counts model.CreationCounts
	err := database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Select("COUNT(*) FILTER (WHERE status NOT IN ?) AS open, COUNT(*) FILTER (WHERE created_at > ?) AS recent", terminalStatuses, since).
		Where("owner = ?", owner).
		Scan(&counts).Error
	return counts, err
}

func (r *contestRepository) Create(ctx context.Context, contest *model.Contest, owner *model.ContestPlayer) error {
	return database.InTx(ctx, func(tx *gorm.DB) error {
		contest.Version = 1
		if err := tx.Create(contest).Error; err != nil {
			return err
		}

		squares := make([]model.Square, 0, model.MaxContestSquares)
		for row := range 10 {
			for col := range 10 {
				squares = append(squares, model.Square{
					ContestID: contest.ID,
					Row:       row,
					Col:       col,
					Value:     "",
					Version:   1,
				})
			}
		}

		if err := tx.Create(&squares).Error; err != nil {
			return err
		}

		owner.ContestID = contest.ID
		return tx.Create(owner).Error
	})
}

func (r *contestRepository) Update(ctx context.Context, contest *model.Contest) error {
	return saveContest(database.Conn(ctx, r.db), contest)
}

// optimistic lock: the write only lands if nobody else bumped the version since this contest was read
func saveContest(db *gorm.DB, contest *model.Contest) error {
	expected := contest.Version
	contest.Version = expected + 1

	res := db.Model(contest).
		Where("version = ?", expected).
		Select("*").
		Omit(clause.Associations, "id", "invite_token", "created_at", "created_by").
		Updates(contest)
	if res.Error != nil {
		contest.Version = expected
		return res.Error
	}
	if res.RowsAffected == 0 {
		contest.Version = expected
		return errs.ErrVersionConflict
	}

	return nil
}

func (r *contestRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Where("id = ?", id).
		Updates(map[string]any{
			"status":  model.ContestStatusDeleted,
			"version": gorm.Expr("version + 1"),
		}).Error
}

func (r *contestRepository) ResetInviteToken(ctx context.Context, id uuid.UUID) (string, error) {
	token, err := model.NewInviteToken()
	if err != nil {
		return "", err
	}

	res := database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Where("id = ? AND status != ?", id, model.ContestStatusDeleted).
		Update("invite_token", token)
	if res.Error != nil {
		return "", res.Error
	}
	if res.RowsAffected == 0 {
		return "", database.ErrNotFound
	}
	return token, nil
}

func (r *contestRepository) ApplyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult) error {
	return database.InTx(ctx, func(tx *gorm.DB) error {
		if err := saveContest(tx, contest); err != nil {
			return err
		}

		if len(results) == 0 {
			return nil
		}

		// a quarter already on record wins, so a retried tick advances status without duplicating rows
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "contest_id"}, {Name: "quarter"}},
			DoNothing: true,
		}).Create(results).Error
	})
}
