package service

import (
	"context"
	"errors"
	"time"

	"github.com/maxmorhardt/maxstash/libs/squares/initials"

	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
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
	outbox      streams.Outbox
	contests    clients.ContestActivityClient
	revocations cache.RevocationStore
}

func NewUserService(
	repo repository.UserRepository,
	tx database.Transactor,
	outbox streams.Outbox,
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
	log := logging.FromContext(ctx)

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
		DefaultInitials: initials.FromName(defaultDisplayName),
	}

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

		return s.outbox.Add(ctx, events.UsersStream, events.UserUpdatedType, userUpdated(user))
	})
	if err != nil {
		log.Error("failed to create user", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("created user profile")
	return user, nil
}

func (s *userService) UpdateProfile(ctx context.Context, email, initials string) (*model.User, error) {
	log := logging.FromContext(ctx)

	var user *model.User
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		var err error
		user, err = s.repo.UpdateInitials(ctx, email, initials)
		if err != nil {
			return err
		}

		return s.outbox.Add(ctx, events.UsersStream, events.UserUpdatedType, userUpdated(user))
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
	log := logging.FromContext(ctx)

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

		return s.outbox.Add(ctx, events.UsersStream, events.UserDeletedType, events.UserDeleted{Email: email, DeletedAt: deletedAt})
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

func (s *userService) SyncRevocations(ctx context.Context) error {
	log := logging.FromContext(ctx)

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
