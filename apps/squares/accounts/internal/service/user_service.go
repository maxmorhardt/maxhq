package service

import (
	"context"
	"errors"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/squares/initials"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/clients"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/metrics"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"gorm.io/gorm"
)

// matches how long a deletion blocks the account in redis: longer than any refresh token lives
const revocationWindow = 91 * 24 * time.Hour

type UserService interface {
	GetProfile(ctx context.Context, email, defaultDisplayName string) (*model.User, error)
	UpdateProfile(ctx context.Context, email, initials string) (*model.User, error)
	DeleteAccount(ctx context.Context, email string) error
	SignOut(ctx context.Context, email string, issuedAt, expiresAt int64) error
	RestoreAccount(ctx context.Context, email string, issuedAt int64) error
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

func (s *userService) UpdateProfile(ctx context.Context, email, defaultInitials string) (*model.User, error) {
	log := logging.FromContext(ctx)

	var user *model.User
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		var err error
		user, err = s.repo.UpdateInitials(ctx, email, defaultInitials)
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

// the signed-out token stops working everywhere it was copied; the account's other devices keep theirs
func (s *userService) SignOut(ctx context.Context, email string, issuedAt, expiresAt int64) error {
	log := logging.FromContext(ctx)

	if err := s.revocations.RevokeSession(ctx, email, issuedAt, expiresAt); err != nil {
		metrics.IncRedisError("revoke_session")
		log.Error("failed to revoke the signed-out token", "error", err)
		return errs.ErrDependencyFailed
	}

	log.Info("signed out")
	return nil
}

// a deletion blocks even refreshed tokens, so a deleted account's other devices are signed out;
// the web calls this only after an interactive sign-in, which lifts the block for a returning user
func (s *userService) RestoreAccount(ctx context.Context, email string, issuedAt int64) error {
	log := logging.FromContext(ctx)

	restored, err := s.revocations.Restore(ctx, email, issuedAt)
	if err != nil {
		if errors.Is(err, cache.ErrRestoreTooOld) {
			log.Warn("refusing to restore an account with a token from before its deletion")
			return errs.ErrRestoreTooOld
		}
		metrics.IncRedisError("restore")
		log.Error("failed to lift the deletion block", "error", err)
		return errs.ErrDependencyFailed
	}
	if !restored {
		return nil
	}

	// without the tombstone, a restart cannot put the block back
	if err := s.repo.DeleteTombstone(ctx, email); err != nil {
		log.Error("failed to clear the tombstone of a restored account", "error", err)
		return errs.ErrDatabaseUnavailable
	}

	log.Info("restored a deleted account after a new sign-in")
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
