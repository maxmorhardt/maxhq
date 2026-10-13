package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/database"
	"github.com/maxmorhardt/maxstash/libs/go/squares/internalapi"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// contests' copy of the accounts profile: enough to put initials on a square and a name on the leaderboard
type UserProjectionRepository interface {
	GetOrCreate(ctx context.Context, email, defaultDisplayName, defaultInitials string) (*model.User, error)
	Upsert(ctx context.Context, user *model.User) error
	CascadeInitials(ctx context.Context, email, initials string) ([]model.Square, error)
	GetStats(ctx context.Context, email string) (*model.UserStatsResponse, error)
	GetActiveContests(ctx context.Context, email string) ([]internalapi.UserActiveContest, error)
	FirstActivity(ctx context.Context, email string) (*time.Time, error)
	ScrubUserData(ctx context.Context, email string) error
}

type userProjectionRepository struct {
	db *gorm.DB
}

func NewUserProjectionRepository(db *gorm.DB) UserProjectionRepository {
	return &userProjectionRepository{db: db}
}

var liveStatuses = []model.ContestStatus{model.ContestStatusFinished, model.ContestStatusDeleted}

func (r *userProjectionRepository) GetOrCreate(ctx context.Context, email, defaultDisplayName, defaultInitials string) (*model.User, error) {
	conn := database.Conn(ctx, r.db)

	user := &model.User{}
	err := conn.Where("email = ?", email).First(user).Error
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// accounts derives the same defaults from the same claims, so the copy agrees until the user edits it there
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

func (r *userProjectionRepository) Upsert(ctx context.Context, user *model.User) error {
	return database.Conn(ctx, r.db).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "email"}},
			DoUpdates: clause.AssignmentColumns([]string{"display_name", "default_initials", "updated_at"}),
		}).
		Create(user).Error
}

func (r *userProjectionRepository) CascadeInitials(ctx context.Context, email, initials string) ([]model.Square, error) {
	var squares []model.Square

	err := database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		liveContests := tx.Model(&model.Contest{}).Select("id").Where("status NOT IN ?", liveStatuses)

		// finished grids keep the initials they were scored with
		if err := tx.Model(&model.Square{}).
			Where("owner = ? AND value != ? AND contest_id IN (?)", email, "", liveContests).
			Updates(map[string]any{"value": initials, "version": gorm.Expr("version + 1")}).Error; err != nil {
			return err
		}

		// re-select the affected squares so the caller can broadcast the change
		return tx.Where("owner = ? AND value != ? AND contest_id IN (?)", email, "", liveContests).
			Find(&squares).Error
	})
	if err != nil {
		return nil, err
	}

	return squares, nil
}

func (r *userProjectionRepository) GetStats(ctx context.Context, email string) (*model.UserStatsResponse, error) {
	var stats model.UserStatsResponse
	conn := database.Conn(ctx, r.db)

	if err := conn.
		Model(&model.Contest{}).
		Where("owner = ? AND status != ?", email, model.ContestStatusDeleted).
		Count(&stats.ContestsCreated).Error; err != nil {
		return nil, err
	}

	if err := conn.
		Model(&model.ContestParticipant{}).
		Joins("JOIN contests c ON c.id = contest_participants.contest_id AND c.status <> ?", model.ContestStatusDeleted).
		Where("contest_participants.user_id = ?", email).
		Count(&stats.ContestsJoined).Error; err != nil {
		return nil, err
	}

	if err := conn.
		Model(&model.Square{}).
		Joins("JOIN contests c ON c.id = squares.contest_id AND c.status <> ?", model.ContestStatusDeleted).
		Where("squares.owner = ?", email).
		Count(&stats.SquaresClaimed).Error; err != nil {
		return nil, err
	}

	if err := conn.
		Model(&model.QuarterResult{}).
		Joins("JOIN contests c ON c.id = quarter_results.contest_id AND c.status <> ?", model.ContestStatusDeleted).
		Where("quarter_results.winner = ?", email).
		Count(&stats.QuarterWins).Error; err != nil {
		return nil, err
	}

	// every quarter the user had a stake in, so the win rate is wins per opportunity
	if err := conn.Raw(
		`SELECT COUNT(*)
		FROM quarter_results q
		JOIN contests c ON c.id = q.contest_id AND c.status <> ?
		WHERE EXISTS (
			SELECT 1 FROM squares s WHERE s.contest_id = q.contest_id AND s.owner = ?
		)`, model.ContestStatusDeleted, email).
		Scan(&stats.QuartersPlayed).Error; err != nil {
		return nil, err
	}

	return &stats, nil
}

func (r *userProjectionRepository) GetActiveContests(ctx context.Context, email string) ([]internalapi.UserActiveContest, error) {
	var contests []internalapi.UserActiveContest

	// contests that still receive live updates, where the user is the owner or a participant
	if err := database.Conn(ctx, r.db).Raw(
		`SELECT c.id, c.name, c.owner, CASE WHEN c.owner = ? THEN 'owner' ELSE 'participant' END AS role
		FROM contests c
		WHERE c.status NOT IN ?
		AND (c.owner = ? OR c.id IN (SELECT contest_id FROM contest_participants WHERE user_id = ?))
		ORDER BY c.created_at`,
		email, liveStatuses, email, email).
		Scan(&contests).Error; err != nil {
		return nil, err
	}

	return contests, nil
}

// member since reflects the user's first activity, not their first profile visit
func (r *userProjectionRepository) FirstActivity(ctx context.Context, email string) (*time.Time, error) {
	var firstActivity sql.NullTime
	if err := database.Conn(ctx, r.db).Raw(
		`SELECT MIN(t) FROM (
			SELECT MIN(created_at) AS t FROM contests WHERE owner = ?
			UNION ALL
			SELECT MIN(joined_at) FROM contest_participants WHERE user_id = ?
		) activity`, email, email).Scan(&firstActivity).Error; err != nil {
		return nil, err
	}

	if !firstActivity.Valid {
		return nil, nil
	}

	return &firstActivity.Time, nil
}

// accounts owns the tombstone and the profile; this removes everything contests holds about the user
func (r *userProjectionRepository) ScrubUserData(ctx context.Context, email string) error {
	return database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		// free the user's squares in contests that are still being played
		if err := tx.Model(&model.Square{}).
			Where("owner = ? AND contest_id IN (?)", email,
				tx.Model(&model.Contest{}).Select("id").Where("status NOT IN ?", liveStatuses)).
			Updates(map[string]any{"value": "", "owner": "", "owner_name": "", "version": gorm.Expr("version + 1")}).Error; err != nil {
			return err
		}

		// finished/deleted contests keep their history under the ghost identity
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

		if err := tx.Where("user_id = ?", email).Delete(&model.ContestParticipant{}).Error; err != nil {
			return err
		}

		return tx.Where("email = ?", email).Delete(&model.User{}).Error
	})
}
