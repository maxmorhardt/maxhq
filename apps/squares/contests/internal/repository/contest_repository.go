package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ContestRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*model.Contest, error)
	GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*model.Contest, error)
	GetVisibilityByID(ctx context.Context, id uuid.UUID) (model.ContestVisibility, error)
	ExistsByOwnerAndName(ctx context.Context, owner, name string) (bool, error)
	GetAllByOwnerPaginated(ctx context.Context, owner string, page, limit int, search string) ([]model.Contest, int64, error)
	GetAllByParticipantUserID(ctx context.Context, userID, search string) ([]model.Contest, error)
	GetIDsByGameID(ctx context.Context, gameID uuid.UUID) ([]uuid.UUID, error)

	Create(ctx context.Context, contest *model.Contest, owner *model.ContestParticipant) error
	Update(ctx context.Context, contest *model.Contest) error
	Delete(ctx context.Context, id uuid.UUID) error
	ApplyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult) error
	RollbackQuarterResult(ctx context.Context, resultID uuid.UUID, contest *model.Contest) error

	ClaimSquare(ctx context.Context, square *model.Square, value, owner, ownerName string) (*model.Square, error)
	ClearSquare(ctx context.Context, square *model.Square) (*model.Square, error)
	GhostSquare(ctx context.Context, square *model.Square) (*model.Square, error)
	ClearSquaresByOwner(ctx context.Context, contestID uuid.UUID, owner string) ([]model.Square, error)
}

type contestRepository struct {
	db *gorm.DB
}

func NewContestRepository(db *gorm.DB) ContestRepository {
	return &contestRepository{
		db: db,
	}
}

// ====================
// Getters
// ====================

func (r *contestRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Contest, error) {
	return r.getByID(database.Conn(ctx, r.db), id)
}

// locks the contest row until the caller's transaction ends, so state checks and the write that follows cannot interleave with square edits
func (r *contestRepository) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*model.Contest, error) {
	return r.getByID(database.Conn(ctx, r.db).Clauses(clause.Locking{Strength: "UPDATE"}), id)
}

func (r *contestRepository) getByID(db *gorm.DB, id uuid.UUID) (*model.Contest, error) {
	var contest model.Contest
	err := db.
		Preload("Squares").
		Preload("QuarterResults", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		Preload("Game.Scores", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		First(&contest, "id = ? AND status != ?", id, model.ContestStatusDeleted).Error

	return &contest, err
}

func (r *contestRepository) GetVisibilityByID(ctx context.Context, id uuid.UUID) (model.ContestVisibility, error) {
	var contest model.Contest
	err := database.Conn(ctx, r.db).
		Select("visibility").
		First(&contest, "id = ? AND status != ?", id, model.ContestStatusDeleted).Error
	return contest.Visibility, err
}

func (r *contestRepository) ExistsByOwnerAndName(ctx context.Context, owner, name string) (bool, error) {
	var count int64
	err := database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Where("owner = ? AND name = ? AND status != ?", owner, name, model.ContestStatusDeleted).
		Count(&count).Error

	return count > 0, err
}

func (r *contestRepository) GetAllByOwnerPaginated(ctx context.Context, owner string, page, limit int, search string) ([]model.Contest, int64, error) {
	var contests []model.Contest
	var total int64

	q := database.Conn(ctx, r.db).Model(&model.Contest{}).Where("created_by = ? AND status != ?", owner, model.ContestStatusDeleted)
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+search+"%")
	}

	// get total count of contests for user
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// calculate offset and fetch paginated contests
	offset := (page - 1) * limit
	err := q.
		Order("updated_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&contests).Error

	return contests, total, err
}

func (r *contestRepository) GetAllByParticipantUserID(ctx context.Context, userID, search string) ([]model.Contest, error) {
	var contests []model.Contest

	q := database.Conn(ctx, r.db).
		Model(&model.Contest{}).
		Select("contests.*").
		Preload("Squares").
		Preload("QuarterResults", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		Preload("Game.Scores", func(db *gorm.DB) *gorm.DB {
			return db.Order("quarter ASC")
		}).
		Joins("JOIN contest_participants cp ON cp.contest_id = contests.id").
		Where("cp.user_id = ? AND cp.role != ? AND contests.status != ?", userID, model.ParticipantRoleOwner, model.ContestStatusDeleted)

	if search != "" {
		q = q.Where("contests.name ILIKE ?", "%"+search+"%")
	}

	err := q.Order("cp.joined_at DESC").Find(&contests).Error
	return contests, err
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

// ====================
// Contest Lifecycle Actions
// ====================

func (r *contestRepository) Create(ctx context.Context, contest *model.Contest, owner *model.ContestParticipant) error {
	return database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		contest.Version = 1
		if err := tx.Create(contest).Error; err != nil {
			return err
		}

		// initialize 10x10 grid of squares
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

		// create owner participant within the same transaction
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
		Omit(clause.Associations, "id", "created_at", "created_by").
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

func (r *contestRepository) ApplyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult) error {
	return database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
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

func (r *contestRepository) RollbackQuarterResult(ctx context.Context, resultID uuid.UUID, contest *model.Contest) error {
	return database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&model.QuarterResult{}, "id = ?", resultID).Error; err != nil {
			return err
		}

		return saveContest(tx, contest)
	})
}

// ====================
// Square Actions
// ====================

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

func (r *contestRepository) ClaimSquare(ctx context.Context, square *model.Square, value, owner, ownerName string) (*model.Square, error) {
	err := database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
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

		// only an unclaimed square or one the caller already owns can be written, decided by the database
		res := tx.Model(&model.Square{}).
			Where("id = ? AND (owner = ? OR owner = ?)", square.ID, "", owner).
			Updates(map[string]any{
				"value":      value,
				"owner":      owner,
				"owner_name": ownerName,
				"updated_by": owner,
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

func (r *contestRepository) ClearSquare(ctx context.Context, square *model.Square) (*model.Square, error) {
	err := database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, square.ContestID); err != nil {
			return err
		}

		if err := tx.Model(&model.Square{}).
			Where("id = ?", square.ID).
			Updates(map[string]any{
				"value":      "",
				"owner":      "",
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

// in-progress squares keep their value so scoring is unaffected; only the owner identity is dropped
func (r *contestRepository) GhostSquare(ctx context.Context, square *model.Square) (*model.Square, error) {
	err := database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
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

func (r *contestRepository) ClearSquaresByOwner(ctx context.Context, contestID uuid.UUID, owner string) ([]model.Square, error) {
	var clearedSquares []model.Square
	err := database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		if err := lockActiveContest(tx, contestID); err != nil {
			return err
		}

		// note which squares are about to change so their cleared state can be broadcast
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
				"version":    gorm.Expr("version + 1"),
			}).Error; err != nil {
			return err
		}

		return tx.Where("id IN ?", ids).Order("\"row\", col").Find(&clearedSquares).Error
	})

	return clearedSquares, err
}
