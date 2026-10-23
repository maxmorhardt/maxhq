package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

type SnapshotService interface {
	GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*model.ContestSnapshot, error)
}

type snapshotService struct {
	contestRepo        repository.ContestRepository
	participantService ParticipantService
}

func NewSnapshotService(contestRepo repository.ContestRepository, participantService ParticipantService) SnapshotService {
	return &snapshotService{contestRepo: contestRepo, participantService: participantService}
}

// realtime replays only events after the position it read first, so a replica missing a commit would lose it for good
func (s *snapshotService) GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*model.ContestSnapshot, error) {
	log := logging.FromContext(ctx)
	ctx = database.ReadPrimary(ctx)

	if err := s.participantService.Authorize(ctx, contestID, user, ActionView); err != nil {
		if errors.Is(err, errs.ErrContestNotFound) || errors.Is(err, errs.ErrDatabaseUnavailable) {
			return nil, err
		}
		log.Warn("user not authorized to view contest", "contest_id", contestID, "user", user)
		return nil, errs.ErrInsufficientRole
	}

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest for snapshot", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	util.SynthesizeFromGame(contest)

	participants, err := s.participantService.GetParticipants(ctx, contestID)
	if err != nil {
		return nil, err
	}

	return &model.ContestSnapshot{Contest: contest, Participants: participants}, nil
}
