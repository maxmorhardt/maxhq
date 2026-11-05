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

type PlayerService interface {
	GetPlayers(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, error)
	GetRoster(ctx context.Context, contestID uuid.UUID, user string) ([]model.PlayerIdentity, error)
	UpdatePlayer(ctx context.Context, contestID uuid.UUID, targetUserID string, maxSquares int, user string) (*model.ContestPlayer, error)
	AllotSquares(ctx context.Context, contestID uuid.UUID, maxSquares int, user string) ([]model.ContestPlayer, error)
	RemovePlayer(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	GetBans(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestBan, error)
	Unban(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error
	Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error
}

type playerService struct {
	playerRepo  repository.PlayerRepository
	contestRepo repository.ContestRepository
	squareRepo  repository.SquareRepository
	banRepo     repository.BanRepository
	tx          database.Transactor
	events      ContestEventPublisher
}

func NewPlayerService(
	playerRepo repository.PlayerRepository,
	contestRepo repository.ContestRepository,
	squareRepo repository.SquareRepository,
	banRepo repository.BanRepository,
	tx database.Transactor,
	events ContestEventPublisher,
) PlayerService {
	return &playerService{
		playerRepo:  playerRepo,
		contestRepo: contestRepo,
		squareRepo:  squareRepo,
		banRepo:     banRepo,
		tx:          tx,
		events:      events,
	}
}

type Action int

const (
	ActionView Action = iota
	ActionClaimSquare
	ActionEditContest
	ActionManagePlayers
	ActionDeleteContest
)

var rolePermissions = map[model.PlayerRole]map[Action]bool{
	model.PlayerRoleOwner: {
		ActionView:          true,
		ActionClaimSquare:   true,
		ActionEditContest:   true,
		ActionManagePlayers: true,
		ActionDeleteContest: true,
	},
	model.PlayerRolePlayer: {
		ActionView:        true,
		ActionClaimSquare: true,
	},
}

func (s *playerService) Authorize(ctx context.Context, contestID uuid.UUID, userID string, act Action) error {
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

	player, err := s.playerRepo.GetByContestAndUser(ctx, contestID, userID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return errs.ErrNotPlayer
		}
		log.Error("failed to get player for authorization", "contest_id", contestID, "user_id", userID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	perms, exists := rolePermissions[player.Role]
	if !exists || !perms[act] {
		return errs.ErrInsufficientRole
	}

	return nil
}

func (s *playerService) GetPlayers(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, error) {
	log := logging.FromContext(ctx)

	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		log.Error("failed to get players", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved players", "contest_id", contestID, "count", len(players))
	return players, nil
}

func (s *playerService) GetRoster(ctx context.Context, contestID uuid.UUID, user string) ([]model.PlayerIdentity, error) {
	if err := s.Authorize(ctx, contestID, user, ActionManagePlayers); err != nil {
		return nil, err
	}

	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get players for roster", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	roster := make([]model.PlayerIdentity, 0, len(players))
	for i := range players {
		roster = append(roster, model.PlayerIdentity{
			UserID:   pseudonym.Of(players[i].UserID),
			FullName: pseudonym.FullName(players[i].DisplayName),
		})
	}
	return roster, nil
}

func (s *playerService) UpdatePlayer(ctx context.Context, contestID uuid.UUID, targetUserID string, maxSquares int, user string) (*model.ContestPlayer, error) {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManagePlayers); err != nil {
		return nil, err
	}

	var player *model.ContestPlayer
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.lockForAllotment(ctx, contestID); err != nil {
			return err
		}

		target, err := s.resolveTarget(ctx, contestID, targetUserID)
		if err != nil {
			return err
		}

		player, err = s.playerRepo.GetByContestAndUser(ctx, contestID, target)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrNotPlayer
			}
			log.Error("failed to get player", "contest_id", contestID, "user_id", target, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if maxSquares == player.MaxSquares {
			return nil
		}

		if maxSquares > player.MaxSquares {
			if err := s.checkPool(ctx, contestID, maxSquares-player.MaxSquares); err != nil {
				return err
			}
		} else if err := s.trimSquares(ctx, contestID, target, maxSquares); err != nil {
			return err
		}

		player.MaxSquares = maxSquares
		if err := s.playerRepo.Update(ctx, player); err != nil {
			log.Error("failed to update player", "contest_id", contestID, "user_id", target, "error", err)
			return err
		}

		return s.events.PublishPlayerUpdated(ctx, contestID, user, player)
	})
	if err != nil {
		return nil, err
	}

	log.Info("player updated", "contest_id", contestID, "target_user", targetUserID, "max_squares", maxSquares)
	return player, nil
}

func (s *playerService) AllotSquares(ctx context.Context, contestID uuid.UUID, maxSquares int, user string) ([]model.ContestPlayer, error) {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManagePlayers); err != nil {
		return nil, err
	}

	var allotted []model.ContestPlayer
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.lockForAllotment(ctx, contestID); err != nil {
			return err
		}

		players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
		if err != nil {
			log.Error("failed to get players to allot squares", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		allotted = make([]model.ContestPlayer, 0, len(players))
		for i := range players {
			if players[i].Role == model.PlayerRolePlayer && players[i].MaxSquares == 0 {
				allotted = append(allotted, players[i])
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
			if err := s.playerRepo.Update(ctx, &allotted[i]); err != nil {
				log.Error("failed to allot squares", "contest_id", contestID, "user_id", allotted[i].UserID, "error", err)
				return err
			}
			if err := s.events.PublishPlayerUpdated(ctx, contestID, user, &allotted[i]); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	log.Info("allotted squares", "contest_id", contestID, "players", len(allotted), "max_squares", maxSquares)
	return allotted, nil
}

func (s *playerService) lockForAllotment(ctx context.Context, contestID uuid.UUID) error {
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
		return errs.ErrPlayersLocked
	}
	return nil
}

func (s *playerService) checkPool(ctx context.Context, contestID uuid.UUID, added int) error {
	allocated, err := s.playerRepo.GetTotalAllocatedSquares(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get total allocated squares", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}
	if allocated+added > model.MaxContestSquares {
		return errs.ErrNotEnoughSquares
	}
	return nil
}

func (s *playerService) trimSquares(ctx context.Context, contestID uuid.UUID, userID string, maxSquares int) error {
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

func (s *playerService) RemovePlayer(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
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
			log.Warn("cannot remove player from a finalized contest", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestFinalized
		}

		player, err := s.playerRepo.GetByContestAndUser(ctx, contestID, targetUserID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrNotPlayer
			}
			log.Error("failed to get player", "contest_id", contestID, "user_id", targetUserID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if player.Role == model.PlayerRoleOwner {
			return errs.ErrCannotRemoveOwner
		}

		// before kickoff the squares go back to the pool. after kickoff they are ghosted
		ghost := contest.Status != model.ContestStatusActive
		if releaseErr := s.releasePlayerSquares(ctx, contestID, targetUserID, ghost); releaseErr != nil {
			log.Error("failed to release player squares", "contest_id", contestID, "user_id", targetUserID, "ghost", ghost, "error", releaseErr)
			return releaseErr
		}

		if deleteErr := s.playerRepo.Delete(ctx, contestID, targetUserID); deleteErr != nil {
			log.Error("failed to delete player", "contest_id", contestID, "user_id", targetUserID, "error", deleteErr)
			return deleteErr
		}

		if !leaving {
			if banErr := s.banRepo.Create(ctx, &model.ContestBan{ContestID: contestID, UserID: targetUserID}); banErr != nil {
				log.Error("failed to ban removed player", "contest_id", contestID, "user_id", targetUserID, "error", banErr)
				return banErr
			}
		}

		return s.events.PublishPlayerRemoved(ctx, contestID, user, player)
	})
	if err != nil {
		return err
	}

	metrics.IncPlayerRemoved()
	log.Info("player removed", "contest_id", contestID, "target_user", targetUserID, "banned", !leaving)
	return nil
}

func (s *playerService) GetBans(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestBan, error) {
	if err := s.Authorize(ctx, contestID, user, ActionManagePlayers); err != nil {
		return nil, err
	}

	bans, err := s.banRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get bans", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	return bans, nil
}

func (s *playerService) Unban(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	if err := s.Authorize(ctx, contestID, user, ActionManagePlayers); err != nil {
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
		log.Info("player unbanned", "contest_id", contestID, "target_user", targetUserID)
		return nil
	}
	return errs.ErrNotBanned
}

// players can always leave; removing someone else takes a manager and bans them
func (s *playerService) removalTarget(ctx context.Context, contestID uuid.UUID, target, user string) (resolved string, leaving bool, err error) {
	if target != pseudonym.Of(user) {
		if authErr := s.Authorize(ctx, contestID, user, ActionManagePlayers); authErr != nil {
			return "", false, authErr
		}
		resolved, err = s.resolveTarget(ctx, contestID, target)
		return resolved, false, err
	}

	if _, lookupErr := s.playerRepo.GetByContestAndUser(ctx, contestID, user); lookupErr != nil {
		if errors.Is(lookupErr, database.ErrNotFound) {
			return "", false, errs.ErrNotPlayer
		}
		logging.FromContext(ctx).Error("failed to get player", "contest_id", contestID, "error", lookupErr)
		return "", false, errs.ErrDatabaseUnavailable
	}
	return user, true, nil
}

func (s *playerService) resolveTarget(ctx context.Context, contestID uuid.UUID, target string) (string, error) {
	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get players to resolve a pseudonym", "contest_id", contestID, "error", err)
		return "", errs.ErrDatabaseUnavailable
	}

	for i := range players {
		if pseudonym.Of(players[i].UserID) == target {
			return players[i].UserID, nil
		}
	}
	return "", errs.ErrNotPlayer
}

func (s *playerService) releasePlayerSquares(ctx context.Context, contestID uuid.UUID, userID string, ghost bool) error {
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
