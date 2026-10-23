package repository

import (
	"context"
	"errors"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository interface {
	GetOrCreate(ctx context.Context, email, defaultDisplayName, defaultInitials string) (*model.User, error)
	Upsert(ctx context.Context, user *model.User) error
	Scrub(ctx context.Context, email string) (cleared []model.Square, removed []model.ContestParticipant, err error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetOrCreate(ctx context.Context, email, defaultDisplayName, defaultInitials string) (*model.User, error) {
	conn := database.Conn(ctx, r.db)

	user := &model.User{}
	err := conn.Where("email = ?", email).First(user).Error
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	newUser := &model.User{Email: email, DisplayName: defaultDisplayName, DefaultInitials: defaultInitials}
	if err := conn.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "email"}}, DoNothing: true}).
		Create(newUser).Error; err != nil {
		return nil, err
	}

	user = &model.User{}
	if err := conn.Where("email = ?", email).First(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func (r *userRepository) Upsert(ctx context.Context, user *model.User) error {
	return database.Conn(ctx, r.db).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "email"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "default_initials", "updated_at"}),
		}).
		Create(user).Error
}

// returns what live viewers need to hear about: the squares freed in unfinished contests and the memberships removed
func (r *userRepository) Scrub(ctx context.Context, email string) (cleared []model.Square, removed []model.ContestParticipant, err error) {
	err = database.InTx(ctx, func(tx *gorm.DB) error {
		if err := tx.Model(&cleared).Clauses(clause.Returning{}).
			Where("owner = ? AND contest_id IN (?)", email,
				tx.Model(&model.Contest{}).Select("id").Where("status NOT IN ?", terminalStatuses)).
			Updates(map[string]any{"value": "", "owner": "", "owner_name": "", "claimed_at": nil, "version": gorm.Expr("version + 1")}).Error; err != nil {
			return err
		}

		anonymize := []struct {
			tableModel any
			column     string
		}{
			{&model.Square{}, "owner"},
			{&model.Square{}, "created_by"},
			{&model.Square{}, "updated_by"},
			{&model.QuarterResult{}, "winner"},
			{&model.QuarterResult{}, "created_by"},
			{&model.QuarterResult{}, "updated_by"},
			{&model.Contest{}, "owner"},
			{&model.Contest{}, "created_by"},
			{&model.Contest{}, "updated_by"},
			{&model.ContestInvite{}, "created_by"},
		}
		for _, a := range anonymize {
			if err := tx.Model(a.tableModel).
				Where(a.column+" = ?", email).
				Update(a.column, model.GhostUser).Error; err != nil {
				return err
			}
		}

		if err := tx.Clauses(clause.Returning{}).Where("user_id = ?", email).Delete(&removed).Error; err != nil {
			return err
		}

		return tx.Where("email = ?", email).Delete(&model.User{}).Error
	})
	if err != nil {
		return nil, nil, err
	}
	return cleared, removed, nil
}
