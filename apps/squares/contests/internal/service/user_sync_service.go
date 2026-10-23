package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
)

type UserSyncService interface {
	ApplyUserUpdated(ctx context.Context, event *events.UserUpdated) error
	ApplyUserDeleted(ctx context.Context, event *events.UserDeleted) error
}

type userSyncService struct {
	userRepo   repository.UserRepository
	squareRepo repository.SquareRepository
	tx         database.Transactor
	events     ContestEventPublisher
}

func NewUserSyncService(userRepo repository.UserRepository, squareRepo repository.SquareRepository, tx database.Transactor, publisher ContestEventPublisher) UserSyncService {
	return &userSyncService{userRepo: userRepo, squareRepo: squareRepo, tx: tx, events: publisher}
}

func (s *userSyncService) ApplyUserUpdated(ctx context.Context, event *events.UserUpdated) error {
	log := logging.FromContext(ctx).With("user", event.Email)

	var cascaded int
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		user := &model.User{
			Email:           event.Email,
			DisplayName:     event.DisplayName,
			DefaultInitials: event.DefaultInitials,
			UpdatedAt:       time.Now(),
		}
		if err := s.userRepo.Upsert(ctx, user); err != nil {
			return err
		}

		if event.DefaultInitials == "" {
			return nil
		}

		squares, err := s.squareRepo.UpdateInitials(ctx, event.Email, event.DefaultInitials)
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

func (s *userSyncService) ApplyUserDeleted(ctx context.Context, event *events.UserDeleted) error {
	log := logging.FromContext(ctx).With("user", event.Email)

	var cleared int
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		squares, participants, err := s.userRepo.Scrub(ctx, event.Email)
		if err != nil {
			return err
		}
		cleared = len(squares)

		for i := range squares {
			if err := s.events.PublishSquareUpdate(ctx, squares[i].ContestID, systemUser, &squares[i]); err != nil {
				return err
			}
		}
		for i := range participants {
			if err := s.events.PublishParticipantRemoved(ctx, participants[i].ContestID, systemUser, &participants[i]); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Error("failed to scrub deleted user", "error", err)
		return err
	}

	log.Info("scrubbed deleted user from contests", "cleared_squares", cleared)
	return nil
}
