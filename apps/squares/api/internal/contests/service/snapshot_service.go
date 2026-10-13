package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"gorm.io/gorm"
)

// the full state a realtime stream starts from, served only to someone allowed to view the contest
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

func (s *snapshotService) GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*model.ContestSnapshot, error) {
	log := util.LoggerFromContext(ctx)

	if err := s.participantService.Authorize(ctx, contestID, user, ActionView); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrContestNotFound
		}
		if errors.Is(err, errs.ErrDatabaseUnavailable) {
			return nil, err
		}
		log.Warn("user not authorized to view contest", "contest_id", contestID, "user", user)
		return nil, errs.ErrInsufficientRole
	}

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest for snapshot", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	// game-linked contests read their quarter results from the shared game record
	util.SynthesizeFromGame(contest)

	participants, err := s.participantService.GetParticipantsInternal(ctx, contestID)
	if err != nil {
		return nil, err
	}

	return &model.ContestSnapshot{Contest: contest, Participants: participants}, nil
}
