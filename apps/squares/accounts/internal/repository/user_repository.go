package repository

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Tombstone struct {
	Email     string
	DeletedAt time.Time
}

type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	CreateIfMissing(ctx context.Context, user *model.User) (*model.User, bool, error)
	UpdateInitials(ctx context.Context, email, initials string) (*model.User, error)
	DeleteWithTombstone(ctx context.Context, email string, deletedAt time.Time) error
	TombstonesSince(ctx context.Context, since time.Time) ([]Tombstone, error)
	HasTombstone(ctx context.Context, email string) (bool, error)
	RestoreTombstone(ctx context.Context, email string, restoredAt time.Time) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{
		db: db,
	}
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	user := &model.User{}
	if err := database.Conn(ctx, r.db).Where("email = ?", email).First(user).Error; err != nil {
		return nil, database.TranslateError(err)
	}

	return user, nil
}

// a concurrent first visit may have created the row already; whichever insert won is returned
func (r *userRepository) CreateIfMissing(ctx context.Context, user *model.User) (*model.User, bool, error) {
	conn := database.Conn(ctx, r.db)

	res := conn.
		Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "email"}}, DoNothing: true}).
		Create(user)
	if res.Error != nil {
		return nil, false, res.Error
	}

	stored := &model.User{}
	if err := conn.Where("email = ?", user.Email).First(stored).Error; err != nil {
		return nil, false, err
	}

	return stored, res.RowsAffected > 0, nil
}

func (r *userRepository) UpdateInitials(ctx context.Context, email, initials string) (*model.User, error) {
	conn := database.Conn(ctx, r.db)

	res := conn.Model(&model.User{}).Where("email = ?", email).Update("default_initials", initials)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, database.ErrNotFound
	}

	user := &model.User{}
	if err := conn.Where("email = ?", email).First(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func (r *userRepository) DeleteWithTombstone(ctx context.Context, email string, deletedAt time.Time) error {
	return database.InTx(ctx, func(tx *gorm.DB) error {
		if err := tx.Where("email = ?", email).Delete(&model.User{}).Error; err != nil {
			return err
		}

		return tx.Exec(
			`INSERT INTO deleted_accounts (email, deleted_at) VALUES (?, ?)
			ON CONFLICT (email) DO UPDATE SET deleted_at = EXCLUDED.deleted_at, restored_at = NULL`,
			email, deletedAt).Error
	})
}

func (r *userRepository) TombstonesSince(ctx context.Context, since time.Time) ([]Tombstone, error) {
	var tombstones []Tombstone
	err := database.Conn(ctx, r.db).
		Table("deleted_accounts").
		Select("email, deleted_at").
		Where("deleted_at >= ? AND restored_at IS NULL", since).
		Scan(&tombstones).Error
	return tombstones, err
}

func (r *userRepository) HasTombstone(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := database.Conn(ctx, r.db).
		Raw(`SELECT EXISTS (SELECT 1 FROM deleted_accounts WHERE email = ?)`, email).
		Scan(&exists).Error
	return exists, err
}

// kept rather than deleted so a returning player isn't counted as a sign-up again
func (r *userRepository) RestoreTombstone(ctx context.Context, email string, restoredAt time.Time) error {
	return database.Conn(ctx, r.db).
		Exec(`UPDATE deleted_accounts SET restored_at = ? WHERE email = ?`, restoredAt, email).Error
}
