package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"gorm.io/gorm"
)

type ParticipantService interface {
	GetParticipants(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestParticipant, error)
	GetParticipantsInternal(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error)
	UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, req *model.UpdateParticipantRequest, user string) (*model.ContestParticipant, error)
	RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error
}

type participantService struct {
	participantRepo repository.ParticipantRepository
	contestRepo     repository.ContestRepository
	tx              database.Transactor
	events          ContestEventPublisher
}

func NewParticipantService(
	participantRepo repository.ParticipantRepository,
	contestRepo repository.ContestRepository,
	tx database.Transactor,
	events ContestEventPublisher,
) ParticipantService {
	return &participantService{
		participantRepo: participantRepo,
		contestRepo:     contestRepo,
		tx:              tx,
		events:          events,
	}
}

type Action int

const (
	ActionView Action = iota
	ActionClaimSquare
	ActionEditContest
	ActionManageInvites
	ActionDeleteContest
)

var rolePermissions = map[model.ParticipantRole]map[Action]bool{
	model.ParticipantRoleOwner: {
		ActionView:          true,
		ActionClaimSquare:   true,
		ActionEditContest:   true,
		ActionManageInvites: true,
		ActionDeleteContest: true,
	},
	model.ParticipantRoleParticipant: {
		ActionView:        true,
		ActionClaimSquare: true,
	},
	model.ParticipantRoleViewer: {
		ActionView: true,
	},
}

func (s *participantService) Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error {
	log := logging.FromContext(ctx)

	if act == ActionView {
		visibility, err := s.contestRepo.GetVisibilityByID(ctx, contestID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			log.Error("failed to get contest visibility for authorization", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if visibility == model.ContestVisibilityPublic {
			return nil
		}
	}

	participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.ErrNotParticipant
		}
		log.Error("failed to get participant for authorization", "contest_id", contestID, "user_id", userID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	perms, exists := rolePermissions[participant.Role]
	if !exists || !perms[act] {
		return errs.ErrInsufficientRole
	}

	return nil
}

func (s *participantService) GetParticipants(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestParticipant, error) {
	if err := s.Authorize(ctx, contestID, user, ActionView); err != nil {
		return nil, err
	}

	return s.fetchParticipants(ctx, contestID)
}

func (s *participantService) GetParticipantsInternal(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error) {
	return s.fetchParticipants(ctx, contestID)
}

func (s *participantService) fetchParticipants(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	participants, err := s.participantRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		log.Error("failed to get participants", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved participants", "contest_id", contestID, "count", len(participants))
	return participants, nil
}

func (s *participantService) UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, req *model.UpdateParticipantRequest, user string) (*model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		log.Error("failed to get contest", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot update participant in terminal state", "contest_id", contestID, "status", contest.Status)
		return nil, errs.ErrContestFinalized
	}

	if authErr := s.Authorize(ctx, contestID, user, ActionManageInvites); authErr != nil {
		return nil, authErr
	}

	participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, targetUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrNotParticipant
		}
		log.Error("failed to get participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if participant.Role == model.ParticipantRoleOwner && req.Role != nil {
		return nil, errs.ErrCannotChangeOwner
	}

	if req.Role != nil {
		participant.Role = model.ParticipantRole(*req.Role)
	}

	targetMax := participant.MaxSquares
	if req.MaxSquares != nil {
		targetMax = *req.MaxSquares
	}

	switch participant.Role {
	case model.ParticipantRoleViewer:
		if req.MaxSquares != nil && *req.MaxSquares > 0 {
			return nil, errs.ErrViewerCannotHaveSquares
		}
		targetMax = 0
	case model.ParticipantRoleParticipant:
		if targetMax < 1 {
			return nil, errs.ErrInvalidSquareCount
		}
	case model.ParticipantRoleOwner:
	}

	if targetMax != participant.MaxSquares {
		claimed, err := s.participantRepo.CountSquaresByUser(ctx, contestID, targetUserID)
		if err != nil {
			log.Error("failed to count squares by user", "contest_id", contestID, "user_id", targetUserID, "error", err)
			return nil, errs.ErrDatabaseUnavailable
		}

		if targetMax < claimed {
			return nil, errs.ErrSquareLimitTooLow
		}

		totalAllocated, err := s.participantRepo.GetTotalAllocatedSquares(ctx, contestID)
		if err != nil {
			log.Error("failed to get total allocated squares", "contest_id", contestID, "error", err)
			return nil, errs.ErrDatabaseUnavailable
		}

		newTotal := totalAllocated - participant.MaxSquares + targetMax
		if newTotal > 100 {
			return nil, errs.ErrNotEnoughSquares
		}

		participant.MaxSquares = targetMax
	}

	if err := s.participantRepo.Update(ctx, participant); err != nil {
		log.Error("failed to update participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
		return nil, err
	}

	log.Info("participant updated", "contest_id", contestID, "target_user", targetUserID)
	return participant, nil
}

func (s *participantService) RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		log.Error("failed to get contest", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot remove participant from a finalized contest", "contest_id", contestID, "status", contest.Status)
		return errs.ErrContestFinalized
	}

	if targetUserID != user {
		if authErr := s.Authorize(ctx, contestID, user, ActionManageInvites); authErr != nil {
			return authErr
		}
	}

	participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, targetUserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.ErrNotParticipant
		}
		log.Error("failed to get participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	if participant.Role == model.ParticipantRoleOwner {
		return errs.ErrCannotRemoveOwner
	}

	err = s.tx.Do(ctx, func(ctx context.Context) error {
		// pre-kickoff squares are freed for others; in-progress squares are ghosted to keep scoring
		ghost := contest.Status != model.ContestStatusActive
		if releaseErr := s.releaseParticipantSquares(ctx, contest, targetUserID, ghost); releaseErr != nil {
			log.Error("failed to release participant squares", "contest_id", contestID, "user_id", targetUserID, "ghost", ghost, "error", releaseErr)
			return releaseErr
		}

		if deleteErr := s.participantRepo.Delete(ctx, contestID, targetUserID); deleteErr != nil {
			log.Error("failed to delete participant", "contest_id", contestID, "user_id", targetUserID, "error", deleteErr)
			return deleteErr
		}

		return s.events.PublishParticipantRemoved(ctx, contestID, user, participant)
	})
	if err != nil {
		return err
	}

	metrics.IncParticipantRemoved()
	log.Info("participant removed", "contest_id", contestID, "target_user", targetUserID)
	return nil
}

func (s *participantService) releaseParticipantSquares(ctx context.Context, contest *model.Contest, userID string, ghost bool) error {
	for i := range contest.Squares {
		if contest.Squares[i].Owner != userID {
			continue
		}

		var updatedSquare *model.Square
		var err error
		if ghost {
			updatedSquare, err = s.contestRepo.GhostSquare(ctx, &contest.Squares[i])
		} else {
			updatedSquare, err = s.contestRepo.ClearSquare(ctx, &contest.Squares[i])
		}
		if err != nil {
			return err
		}

		if err := s.events.PublishSquareUpdate(ctx, contest.ID, userID, updatedSquare); err != nil {
			return err
		}
	}

	return nil
}
