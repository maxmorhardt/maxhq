package service

import (
	"context"
	"errors"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"gorm.io/gorm"
)

// tombstones older than this can no longer match a live token, so they need not be in redis
const revocationWindow = 30 * 24 * time.Hour

type UserService interface {
	GetProfile(ctx context.Context, email, defaultDisplayName string) (*model.User, error)
	UpdateProfile(ctx context.Context, email, initials string) (*model.User, error)
	DeleteAccount(ctx context.Context, email string) error
	SyncRevocations(ctx context.Context) error
}

type userService struct {
	repo        repository.UserRepository
	tx          database.Transactor
	outbox      messaging.Outbox
	contests    clients.ContestActivityClient
	revocations cache.RevocationStore
}

func NewUserService(
	repo repository.UserRepository,
	tx database.Transactor,
	outbox messaging.Outbox,
	contests clients.ContestActivityClient,
	revocations cache.RevocationStore,
) UserService {
	return &userService{
		repo:        repo,
		tx:          tx,
		outbox:      outbox,
		contests:    contests,
		revocations: revocations,
	}
}

func (s *userService) GetProfile(ctx context.Context, email, defaultDisplayName string) (*model.User, error) {
	log := util.LoggerFromContext(ctx)

	user, err := s.repo.GetByEmail(ctx, email)
	if err == nil {
		log.Info("retrieved user profile")
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Error("failed to get user", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	newUser := &model.User{
		Email:           email,
		DisplayName:     defaultDisplayName,
		DefaultInitials: util.InitialsFromName(defaultDisplayName),
	}

	// member since reflects the user's first contest activity; without contests it falls back to now
	if summary, activityErr := s.contests.GetUserActivity(ctx, email); activityErr != nil {
		log.Warn("could not load first activity for new profile", "error", activityErr)
	} else if summary.FirstActivity != nil {
		newUser.CreatedAt = *summary.FirstActivity
	}

	err = s.tx.Do(ctx, func(ctx context.Context) error {
		var createErr error
		user, createErr = s.repo.CreateIfMissing(ctx, newUser)
		if createErr != nil {
			return createErr
		}

		return s.outbox.Add(ctx, events.UserUpdatedSubject, userUpdated(user))
	})
	if err != nil {
		log.Error("failed to create user", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("created user profile")
	return user, nil
}

// contests applies the new initials to the user's live squares when it consumes the event
func (s *userService) UpdateProfile(ctx context.Context, email, initials string) (*model.User, error) {
	log := util.LoggerFromContext(ctx)

	var user *model.User
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		var err error
		user, err = s.repo.UpdateInitials(ctx, email, initials)
		if err != nil {
			return err
		}

		return s.outbox.Add(ctx, events.UserUpdatedSubject, userUpdated(user))
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrUserNotFound
		}
		log.Error("failed to update user profile", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("updated user profile")
	return user, nil
}

func (s *userService) DeleteAccount(ctx context.Context, email string) error {
	log := util.LoggerFromContext(ctx)

	// deletion is blocked while the user owns or participates in live contests, which only contests knows
	summary, err := s.contests.GetUserActivity(ctx, email)
	if err != nil {
		log.Error("failed to check active contests for account deletion", "error", err)
		return errs.ErrDependencyFailed
	}

	if len(summary.ActiveContests) > 0 {
		log.Info("account deletion blocked by active contests", "count", len(summary.ActiveContests))
		return errs.ErrAccountActiveContests
	}

	deletedAt := time.Now()
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if deleteErr := s.repo.DeleteWithTombstone(ctx, email, deletedAt); deleteErr != nil {
			return deleteErr
		}

		// contests scrubs and anonymizes the user's contest history when it consumes this
		return s.outbox.Add(ctx, events.UserDeletedSubject, events.UserDeleted{Email: email, DeletedAt: deletedAt})
	})
	if err != nil {
		log.Error("failed to delete account", "error", err)
		return errs.ErrDatabaseUnavailable
	}

	// the tombstone is already durable; if redis misses this write, SyncRevocations restores it on the next start
	if err := s.revocations.Revoke(ctx, email, deletedAt); err != nil {
		metrics.IncRedisError("revoke")
		log.Error("failed to publish revocation to redis", "error", err)
	}

	log.Info("account deleted")
	return nil
}

// rebuilds the redis revocation list from the durable tombstones, so a flushed redis cannot resurrect deleted tokens
func (s *userService) SyncRevocations(ctx context.Context) error {
	log := util.LoggerFromContext(ctx)

	tombstones, err := s.repo.TombstonesSince(ctx, time.Now().Add(-revocationWindow))
	if err != nil {
		log.Error("failed to load tombstones", "error", err)
		return err
	}

	for _, t := range tombstones {
		if err := s.revocations.Revoke(ctx, t.Email, t.DeletedAt); err != nil {
			log.Error("failed to sync revocation", "error", err)
			return err
		}
	}

	log.Info("synced revocations to redis", "count", len(tombstones))
	return nil
}

func userUpdated(user *model.User) events.UserUpdated {
	return events.UserUpdated{
		Email:           user.Email,
		DisplayName:     user.DisplayName,
		DefaultInitials: user.DefaultInitials,
	}
}
