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
	UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, maxSquares int, user string) (*model.ContestParticipant, error)
	AllotSquares(ctx context.Context, contestID uuid.UUID, maxSquares int, user string) ([]model.ContestParticipant, error)
	RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	GetBans(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestBan, error)
	Unban(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error
}

type participantService struct {
	participantRepo repository.ParticipantRepository
	contestRepo     repository.ContestRepository
	squareRepo      repository.SquareRepository
	banRepo         repository.BanRepository
	tx              database.Transactor
	events          ContestEventPublisher
}

func NewParticipantService(
	participantRepo repository.ParticipantRepository,
	contestRepo repository.ContestRepository,
	squareRepo repository.SquareRepository,
	banRepo repository.BanRepository,
	tx database.Transactor,
	events ContestEventPublisher,
) ParticipantService {
	return &participantService{
		participantRepo: participantRepo,
		contestRepo:     contestRepo,
		squareRepo:      squareRepo,
		banRepo:         banRepo,
		tx:              tx,
		events:          events,
	}
}

type Action int

const (
	ActionView Action = iota
	ActionClaimSquare
	ActionEditContest
	ActionManageParticipants
	ActionDeleteContest
)

var rolePermissions = map[model.ParticipantRole]map[Action]bool{
	model.ParticipantRoleOwner: {
		ActionView:               true,
		ActionClaimSquare:        true,
		ActionEditContest:        true,
		ActionManageParticipants: true,
		ActionDeleteContest:      true,
	},
	model.ParticipantRoleParticipant: {
		ActionView:        true,
		ActionClaimSquare: true,
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
	if err := s.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
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

func (s *participantService) UpdateParticipant(ctx context.Context, contestID uuid.UUID, targetUserID string, maxSquares int, user string) (*model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return nil, err
	}

	var participant *model.ContestParticipant
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.lockForAllotment(ctx, contestID); err != nil {
			return err
		}

		target, err := s.resolveTarget(ctx, contestID, targetUserID)
		if err != nil {
			return err
		}

		participant, err = s.participantRepo.GetByContestAndUser(ctx, contestID, target)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrNotParticipant
			}
			log.Error("failed to get participant", "contest_id", contestID, "user_id", target, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if maxSquares == participant.MaxSquares {
			return nil
		}

		if maxSquares > participant.MaxSquares {
			if err := s.checkPool(ctx, contestID, maxSquares-participant.MaxSquares); err != nil {
				return err
			}
		} else if err := s.trimSquares(ctx, contestID, target, maxSquares); err != nil {
			return err
		}

		participant.MaxSquares = maxSquares
		if err := s.participantRepo.Update(ctx, participant); err != nil {
			log.Error("failed to update participant", "contest_id", contestID, "user_id", target, "error", err)
			return err
		}

		return s.events.PublishParticipantUpdated(ctx, contestID, user, participant)
	})
	if err != nil {
		return nil, err
	}

	log.Info("participant updated", "contest_id", contestID, "target_user", targetUserID, "max_squares", maxSquares)
	return participant, nil
}

func (s *participantService) AllotSquares(ctx context.Context, contestID uuid.UUID, maxSquares int, user string) ([]model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return nil, err
	}

	var allotted []model.ContestParticipant
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.lockForAllotment(ctx, contestID); err != nil {
			return err
		}

		participants, err := s.participantRepo.GetAllByContestID(ctx, contestID)
		if err != nil {
			log.Error("failed to get participants to allot squares", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		allotted = make([]model.ContestParticipant, 0, len(participants))
		for i := range participants {
			if participants[i].Role == model.ParticipantRoleParticipant && participants[i].MaxSquares == 0 {
				allotted = append(allotted, participants[i])
			}
		}
		if len(allotted) == 0 {
			return nil
		}

		if err := s.checkPool(ctx, contestID, maxSquares*len(allotted)); err != nil {
			return err
		}

		for i := range allotted {
			allotted[i].MaxSquares = maxSquares
			if err := s.participantRepo.Update(ctx, &allotted[i]); err != nil {
				log.Error("failed to allot squares", "contest_id", contestID, "user_id", allotted[i].UserID, "error", err)
				return err
			}
			if err := s.events.PublishParticipantUpdated(ctx, contestID, user, &allotted[i]); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	log.Info("allotted squares", "contest_id", contestID, "participants", len(allotted), "max_squares", maxSquares)
	return allotted, nil
}

func (s *participantService) lockForAllotment(ctx context.Context, contestID uuid.UUID) error {
	contest, err := s.contestRepo.GetByIDForUpdate(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return errs.ErrContestNotFound
		}
		logging.FromContext(ctx).Error("failed to get contest", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		return errs.ErrContestFinalized
	}
	if contest.Status != model.ContestStatusActive {
		return errs.ErrParticipantsLocked
	}
	return nil
}

func (s *participantService) checkPool(ctx context.Context, contestID uuid.UUID, added int) error {
	allocated, err := s.participantRepo.GetTotalAllocatedSquares(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get total allocated squares", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}
	if allocated+added > model.MaxContestSquares {
		return errs.ErrNotEnoughSquares
	}
	return nil
}

func (s *participantService) trimSquares(ctx context.Context, contestID uuid.UUID, userID string, maxSquares int) error {
	log := logging.FromContext(ctx)

	claimed, err := s.squareRepo.CountByOwner(ctx, contestID, userID)
	if err != nil {
		log.Error("failed to count squares by user", "contest_id", contestID, "user_id", userID, "error", err)
		return errs.ErrDatabaseUnavailable
	}
	if claimed <= maxSquares {
		return nil
	}

	freed, err := s.squareRepo.ClearRandomByOwner(ctx, contestID, userID, claimed-maxSquares)
	if err != nil {
		log.Error("failed to free squares over the new limit", "contest_id", contestID, "user_id", userID, "error", err)
		return err
	}

	for i := range freed {
		if err := s.events.PublishSquareUpdate(ctx, contestID, userID, &freed[i]); err != nil {
			return err
		}
	}
	return nil
}

func (s *participantService) RemoveParticipant(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	targetUserID, leaving, authErr := s.removalTarget(ctx, contestID, targetUserID, user)
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

		if !leaving {
			if banErr := s.banRepo.Create(ctx, &model.ContestBan{ContestID: contestID, UserID: targetUserID}); banErr != nil {
				log.Error("failed to ban removed participant", "contest_id", contestID, "user_id", targetUserID, "error", banErr)
				return banErr
			}
		}

		return s.events.PublishParticipantRemoved(ctx, contestID, user, participant)
	})
	if err != nil {
		return err
	}

	metrics.IncParticipantRemoved()
	log.Info("participant removed", "contest_id", contestID, "target_user", targetUserID, "banned", !leaving)
	return nil
}

func (s *participantService) GetBans(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestBan, error) {
	if err := s.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return nil, err
	}

	bans, err := s.banRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get bans", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	return bans, nil
}

func (s *participantService) Unban(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return err
	}

	bans, err := s.banRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		log.Error("failed to get bans to resolve a pseudonym", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	for i := range bans {
		if pseudonym.Of(bans[i].UserID) != targetUserID {
			continue
		}
		if err := s.banRepo.Delete(ctx, contestID, bans[i].UserID); err != nil {
			log.Error("failed to unban", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}
		log.Info("participant unbanned", "contest_id", contestID, "target_user", targetUserID)
		return nil
	}
	return errs.ErrNotBanned
}

// participants can always leave; removing someone else takes a manager and bans them
func (s *participantService) removalTarget(ctx context.Context, contestID uuid.UUID, target, user string) (resolved string, leaving bool, err error) {
	if target != pseudonym.Of(user) {
		if authErr := s.Authorize(ctx, contestID, user, ActionManageParticipants); authErr != nil {
			return "", false, authErr
		}
		resolved, err = s.resolveTarget(ctx, contestID, target)
		return resolved, false, err
	}

	if _, lookupErr := s.participantRepo.GetByContestAndUser(ctx, contestID, user); lookupErr != nil {
		if errors.Is(lookupErr, database.ErrNotFound) {
			return "", false, errs.ErrNotParticipant
		}
		logging.FromContext(ctx).Error("failed to get participant", "contest_id", contestID, "error", lookupErr)
		return "", false, errs.ErrDatabaseUnavailable
	}
	return user, true, nil
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
