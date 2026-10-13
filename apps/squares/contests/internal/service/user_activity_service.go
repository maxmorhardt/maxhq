package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/maxmorhardt/maxstash/libs/squares/internalapi"
)

// everything contests knows about a person: their stats, their live contests, and its copy of their profile
type UserActivityService interface {
	GetStats(ctx context.Context, email string) (*model.UserStatsResponse, error)
	GetActiveContests(ctx context.Context, email string) ([]internalapi.UserActiveContest, error)
	GetActivitySummary(ctx context.Context, email string) (*internalapi.UserActivitySummary, error)
	ApplyUserUpdated(ctx context.Context, event *events.UserUpdated) error
	ApplyUserDeleted(ctx context.Context, event *events.UserDeleted) error
}

type userActivityService struct {
	repo   repository.UserProjectionRepository
	tx     database.Transactor
	events ContestEventPublisher
}

func NewUserActivityService(repo repository.UserProjectionRepository, tx database.Transactor, publisher ContestEventPublisher) UserActivityService {
	return &userActivityService{repo: repo, tx: tx, events: publisher}
}

func (s *userActivityService) GetStats(ctx context.Context, email string) (*model.UserStatsResponse, error) {
	log := reqctx.LoggerFromContext(ctx)

	stats, err := s.repo.GetStats(ctx, email)
	if err != nil {
		log.Error("failed to get user stats", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved user stats")
	return stats, nil
}

func (s *userActivityService) GetActiveContests(ctx context.Context, email string) ([]internalapi.UserActiveContest, error) {
	log := reqctx.LoggerFromContext(ctx)

	active, err := s.repo.GetActiveContests(ctx, email)
	if err != nil {
		log.Error("failed to list active contests", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved active contests", "count", len(active))
	return active, nil
}

// what accounts asks before it creates a profile or deletes an account
func (s *userActivityService) GetActivitySummary(ctx context.Context, email string) (*internalapi.UserActivitySummary, error) {
	log := reqctx.LoggerFromContext(ctx)

	active, err := s.repo.GetActiveContests(ctx, email)
	if err != nil {
		log.Error("failed to list active contests for activity summary", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	first, err := s.repo.FirstActivity(ctx, email)
	if err != nil {
		log.Error("failed to get first activity", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if active == nil {
		active = []internalapi.UserActiveContest{}
	}

	return &internalapi.UserActivitySummary{ActiveContests: active, FirstActivity: first}, nil
}

// new initials flow onto the user's squares in live contests, and connected clients see them change
func (s *userActivityService) ApplyUserUpdated(ctx context.Context, event *events.UserUpdated) error {
	log := reqctx.LoggerFromContext(ctx).With("user", event.Email)

	var cascaded int
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		user := &model.User{
			Email:           event.Email,
			DisplayName:     event.DisplayName,
			DefaultInitials: event.DefaultInitials,
			UpdatedAt:       time.Now(),
		}
		if err := s.repo.Upsert(ctx, user); err != nil {
			return err
		}

		if event.DefaultInitials == "" {
			return nil
		}

		squares, err := s.repo.CascadeInitials(ctx, event.Email, event.DefaultInitials)
		if err != nil {
			return err
		}
		cascaded = len(squares)

		for i := range squares {
			if err := s.events.PublishSquareUpdate(ctx, squares[i].ContestID, event.Email, &squares[i]); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		log.Error("failed to apply user update", "error", err)
		return err
	}

	log.Info("applied user update", "cascaded_squares", cascaded)
	return nil
}

// accounts already tombstoned the user; this frees their live squares and anonymizes their history
func (s *userActivityService) ApplyUserDeleted(ctx context.Context, event *events.UserDeleted) error {
	log := reqctx.LoggerFromContext(ctx).With("user", event.Email)

	if err := s.repo.ScrubUserData(ctx, event.Email); err != nil {
		log.Error("failed to scrub deleted user", "error", err)
		return err
	}

	log.Info("scrubbed deleted user from contests")
	return nil
}
