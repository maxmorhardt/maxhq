package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

type ParticipantService interface {
	GetParticipants(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error)
	GetRoster(ctx context.Context, contestID uuid.UUID, user string) ([]model.ParticipantIdentity, error)
	UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, req *model.UpdateParticipantRequest, user string) (*model.ContestParticipant, error)
	RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error
}

type participantService struct {
	participantRepo repository.ParticipantRepository
	contestRepo     repository.ContestRepository
	squareRepo      repository.SquareRepository
	tx              database.Transactor
	events          ContestEventPublisher
}

func NewParticipantService(
	participantRepo repository.ParticipantRepository,
	contestRepo repository.ContestRepository,
	squareRepo repository.SquareRepository,
	tx database.Transactor,
	events ContestEventPublisher,
) ParticipantService {
	return &participantService{
		participantRepo: participantRepo,
		contestRepo:     contestRepo,
		squareRepo:      squareRepo,
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
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrContestNotFound
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
		if errors.Is(err, database.ErrNotFound) {
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

func (s *participantService) GetParticipants(ctx context.Context, contestID uuid.UUID) ([]model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	participants, err := s.participantRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		log.Error("failed to get participants", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved participants", "contest_id", contestID, "count", len(participants))
	return participants, nil
}

func (s *participantService) GetRoster(ctx context.Context, contestID uuid.UUID, user string) ([]model.ParticipantIdentity, error) {
	if err := s.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
		return nil, err
	}

	participants, err := s.participantRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get participants for roster", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	roster := make([]model.ParticipantIdentity, 0, len(participants))
	for i := range participants {
		roster = append(roster, model.ParticipantIdentity{
			UserID:   pseudonym.Of(participants[i].UserID),
			FullName: pseudonym.FullName(participants[i].DisplayName),
		})
	}
	return roster, nil
}

func (s *participantService) UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, req *model.UpdateParticipantRequest, user string) (*model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
		return nil, err
	}

	var participant *model.ContestParticipant
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		// the contest lock serializes this pool check with invite redemptions, which take the same lock
		contest, err := s.contestRepo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrContestNotFound
			}
			log.Error("failed to get contest", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if contest.Status.IsTerminal() {
			log.Warn("cannot update participant in terminal state", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestFinalized
		}

		if contest.Status != model.ContestStatusActive {
			log.Warn("cannot update participant after kickoff", "contest_id", contestID, "status", contest.Status)
			return errs.ErrParticipantsLocked
		}

		if targetUserID, err = s.resolveTarget(ctx, contestID, targetUserID); err != nil {
			return err
		}

		participant, err = s.participantRepo.GetByContestAndUser(ctx, contestID, targetUserID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrNotParticipant
			}
			log.Error("failed to get participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if participant.Role == model.ParticipantRoleOwner && req.Role != nil {
			return errs.ErrCannotChangeOwner
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
				return errs.ErrViewerCannotHaveSquares
			}
			targetMax = 0
		case model.ParticipantRoleParticipant:
			if targetMax < 1 {
				return errs.ErrInvalidSquareCount
			}
		case model.ParticipantRoleOwner:
		}

		if targetMax != participant.MaxSquares {
			claimed, err := s.squareRepo.CountByOwner(ctx, contestID, targetUserID)
			if err != nil {
				log.Error("failed to count squares by user", "contest_id", contestID, "user_id", targetUserID, "error", err)
				return errs.ErrDatabaseUnavailable
			}

			if targetMax < claimed {
				return errs.ErrSquareLimitTooLow
			}

			totalAllocated, err := s.participantRepo.GetTotalAllocatedSquares(ctx, contestID)
			if err != nil {
				log.Error("failed to get total allocated squares", "contest_id", contestID, "error", err)
				return errs.ErrDatabaseUnavailable
			}

			newTotal := totalAllocated - participant.MaxSquares + targetMax
			if newTotal > 100 {
				return errs.ErrNotEnoughSquares
			}

			participant.MaxSquares = targetMax
		}

		if err := s.participantRepo.Update(ctx, participant); err != nil {
			log.Error("failed to update participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
			return err
		}

		return s.events.PublishParticipantUpdated(ctx, contestID, user, participant)
	})
	if err != nil {
		return nil, err
	}

	log.Info("participant updated", "contest_id", contestID, "target_user", targetUserID)
	return participant, nil
}

func (s *participantService) RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	targetUserID, authErr := s.removalTarget(ctx, contestID, targetUserID, user)
	if authErr != nil {
		return authErr
	}

	err := s.tx.Do(ctx, func(ctx context.Context) error {
		// the contest lock waits out in-flight claims and blocks new ones and kickoff, so the squares loaded here are final
		contest, err := s.contestRepo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrContestNotFound
			}
			log.Error("failed to get contest", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if contest.Status.IsTerminal() {
			log.Warn("cannot remove participant from a finalized contest", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestFinalized
		}

		participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, targetUserID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrNotParticipant
			}
			log.Error("failed to get participant", "contest_id", contestID, "user_id", targetUserID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if participant.Role == model.ParticipantRoleOwner {
			return errs.ErrCannotRemoveOwner
		}

		// before kickoff the squares go back to the pool. after kickoff they are ghosted
		ghost := contest.Status != model.ContestStatusActive
		if releaseErr := s.releaseParticipantSquares(ctx, contestID, targetUserID, ghost); releaseErr != nil {
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

// players can always leave; removing someone else takes a manager
func (s *participantService) removalTarget(ctx context.Context, contestID uuid.UUID, target, user string) (string, error) {
	if target != pseudonym.Of(user) {
		if err := s.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
			return "", err
		}
		return s.resolveTarget(ctx, contestID, target)
	}

	if _, err := s.participantRepo.GetByContestAndUser(ctx, contestID, user); err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return "", errs.ErrNotParticipant
		}
		logging.FromContext(ctx).Error("failed to get participant", "contest_id", contestID, "error", err)
		return "", errs.ErrDatabaseUnavailable
	}
	return user, nil
}

func (s *participantService) resolveTarget(ctx context.Context, contestID uuid.UUID, target string) (string, error) {
	participants, err := s.participantRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get participants to resolve a pseudonym", "contest_id", contestID, "error", err)
		return "", errs.ErrDatabaseUnavailable
	}

	for i := range participants {
		if pseudonym.Of(participants[i].UserID) == target {
			return participants[i].UserID, nil
		}
	}
	return "", errs.ErrNotParticipant
}

func (s *participantService) releaseParticipantSquares(ctx context.Context, contestID uuid.UUID, userID string, ghost bool) error {
	release := s.squareRepo.ClearByOwner
	if ghost {
		release = s.squareRepo.GhostByOwner
	}

	squares, err := release(ctx, contestID, userID)
	if err != nil {
		return err
	}

	for i := range squares {
		if err := s.events.PublishSquareUpdate(ctx, contestID, userID, &squares[i]); err != nil {
			return err
		}
	}

	return nil
}
