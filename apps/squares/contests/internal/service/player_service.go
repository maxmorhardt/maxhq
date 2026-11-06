package service

import (
	"context"
	"errors"
	"time"

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

		players, err := s.loadPlayers(ctx, contestID)
		if err != nil {
			return err
		}
		if player, err = findPlayer(players, targetUserID); err != nil {
			return err
		}

		if maxSquares == player.MaxSquares {
			return nil
		}

		if maxSquares > player.MaxSquares {
			if err := checkPool(ctx, contestID, players, maxSquares-player.MaxSquares); err != nil {
				return err
			}
		} else if err := s.trimSquares(ctx, contestID, player.UserID, maxSquares, user); err != nil {
			return err
		}

		player.MaxSquares = maxSquares
		if err := s.playerRepo.Update(ctx, player); err != nil {
			log.Error("failed to update player", "contest_id", contestID, "user_id", player.UserID, "error", err)
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

		players, err := s.loadPlayers(ctx, contestID)
		if err != nil {
			return err
		}

		allotted = make([]model.ContestPlayer, 0, len(players))
		ids := make([]uuid.UUID, 0, len(players))
		for i := range players {
			if players[i].Role == model.PlayerRolePlayer && players[i].MaxSquares == 0 {
				allotted = append(allotted, players[i])
				ids = append(ids, players[i].ID)
			}
		}
		if len(allotted) == 0 {
			return nil
		}

		if poolErr := checkPool(ctx, contestID, players, maxSquares*len(allotted)); poolErr != nil {
			return poolErr
		}

		now := time.Now().UTC().Truncate(time.Microsecond)
		updated, err := s.playerRepo.SetMaxSquares(ctx, contestID, ids, maxSquares, now)
		if err != nil {
			log.Error("failed to allot squares", "contest_id", contestID, "players", len(ids), "error", err)
			return errs.ErrDatabaseUnavailable
		}

		allotted = onlyUpdated(allotted, updated)
		for i := range allotted {
			allotted[i].MaxSquares = maxSquares
			allotted[i].UpdatedAt = now
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

func onlyUpdated(players []model.ContestPlayer, updated []uuid.UUID) []model.ContestPlayer {
	ids := make(map[uuid.UUID]struct{}, len(updated))
	for _, id := range updated {
		ids[id] = struct{}{}
	}

	kept := make([]model.ContestPlayer, 0, len(updated))
	for i := range players {
		if _, ok := ids[players[i].ID]; ok {
			kept = append(kept, players[i])
		}
	}
	return kept
}

func (s *playerService) lockContest(ctx context.Context, contestID uuid.UUID) (model.ContestStatus, error) {
	log := logging.FromContext(ctx)

	status, err := s.contestRepo.LockStatus(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return "", errs.ErrContestNotFound
		}
		log.Error("failed to lock contest", "contest_id", contestID, "error", err)
		return "", errs.ErrDatabaseUnavailable
	}

	if status.IsTerminal() {
		log.Warn("contest is finalized", "contest_id", contestID, "status", status)
		return "", errs.ErrContestFinalized
	}
	return status, nil
}

func (s *playerService) lockForAllotment(ctx context.Context, contestID uuid.UUID) error {
	status, err := s.lockContest(ctx, contestID)
	if err != nil {
		return err
	}
	if status != model.ContestStatusActive {
		return errs.ErrPlayersLocked
	}
	return nil
}

func checkPool(ctx context.Context, contestID uuid.UUID, players []model.ContestPlayer, added int) error {
	allocated := 0
	for i := range players {
		allocated += players[i].MaxSquares
	}
	if allocated+added > model.MaxContestSquares {
		logging.FromContext(ctx).Warn("refusing to give out more squares than the board holds", "contest_id", contestID, "allocated", allocated, "added", added)
		return errs.ErrNotEnoughSquares
	}
	return nil
}

func (s *playerService) trimSquares(ctx context.Context, contestID uuid.UUID, userID string, maxSquares int, actor string) error {
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

	return s.publishSquares(ctx, contestID, actor, freed)
}

func (s *playerService) RemovePlayer(ctx context.Context, contestID uuid.UUID, targetUserID, user string) error {
	log := logging.FromContext(ctx)

	leaving, authErr := s.removalAccess(ctx, contestID, targetUserID, user)
	if authErr != nil {
		return authErr
	}

	var player *model.ContestPlayer
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		// the contest lock waits out in-flight claims and blocks new ones and kickoff, so the squares loaded here are final
		status, err := s.lockContest(ctx, contestID)
		if err != nil {
			return err
		}

		if player, err = s.removalTarget(ctx, contestID, targetUserID, user, leaving); err != nil {
			return err
		}
		if player.Role == model.PlayerRoleOwner {
			return errs.ErrCannotRemoveOwner
		}

		// before kickoff the squares go back to the pool. after kickoff they are ghosted
		ghost := status != model.ContestStatusActive
		if releaseErr := s.releasePlayerSquares(ctx, contestID, player.UserID, user, ghost); releaseErr != nil {
			log.Error("failed to release player squares", "contest_id", contestID, "user_id", player.UserID, "ghost", ghost, "error", releaseErr)
			return releaseErr
		}

		if deleteErr := s.playerRepo.Delete(ctx, contestID, player.UserID); deleteErr != nil {
			log.Error("failed to delete player", "contest_id", contestID, "user_id", player.UserID, "error", deleteErr)
			return deleteErr
		}

		if !leaving {
			if banErr := s.banRepo.Create(ctx, &model.ContestBan{ContestID: contestID, UserID: player.UserID}); banErr != nil {
				log.Error("failed to ban removed player", "contest_id", contestID, "user_id", player.UserID, "error", banErr)
				return banErr
			}
		}

		return s.events.PublishPlayerRemoved(ctx, contestID, user, player)
	})
	if err != nil {
		return err
	}

	metrics.IncPlayerRemoved()
	if !leaving {
		metrics.IncPlayerBanned()
	}
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

	ban := byPseudonym(bans, targetUserID, func(b *model.ContestBan) string { return b.UserID })
	if ban == nil {
		return errs.ErrNotBanned
	}
	if err := s.banRepo.Delete(ctx, contestID, ban.UserID); err != nil {
		log.Error("failed to unban", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	metrics.IncPlayerUnbanned()
	log.Info("player unbanned", "contest_id", contestID, "target_user", targetUserID)
	return nil
}

// players can always leave; removing someone else takes a manager and bans them
func (s *playerService) removalAccess(ctx context.Context, contestID uuid.UUID, target, user string) (bool, error) {
	if target != pseudonym.Of(user) {
		return false, s.Authorize(ctx, contestID, user, ActionManagePlayers)
	}

	if _, err := s.playerRepo.GetByContestAndUser(ctx, contestID, user); err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return false, errs.ErrNotPlayer
		}
		logging.FromContext(ctx).Error("failed to get player", "contest_id", contestID, "error", err)
		return false, errs.ErrDatabaseUnavailable
	}
	return true, nil
}

func (s *playerService) removalTarget(ctx context.Context, contestID uuid.UUID, target, user string, leaving bool) (*model.ContestPlayer, error) {
	if !leaving {
		players, err := s.loadPlayers(ctx, contestID)
		if err != nil {
			return nil, err
		}
		return findPlayer(players, target)
	}

	player, err := s.playerRepo.GetByContestAndUser(ctx, contestID, user)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrNotPlayer
		}
		logging.FromContext(ctx).Error("failed to get player", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	return player, nil
}

func (s *playerService) loadPlayers(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, error) {
	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		logging.FromContext(ctx).Error("failed to get players", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	return players, nil
}

func findPlayer(players []model.ContestPlayer, target string) (*model.ContestPlayer, error) {
	player := byPseudonym(players, target, func(p *model.ContestPlayer) string { return p.UserID })
	if player == nil {
		return nil, errs.ErrPlayerNotFound
	}
	return player, nil
}

func byPseudonym[T any](items []T, target string, userID func(*T) string) *T {
	for i := range items {
		if pseudonym.Of(userID(&items[i])) == target {
			return &items[i]
		}
	}
	return nil
}

func (s *playerService) releasePlayerSquares(ctx context.Context, contestID uuid.UUID, userID, actor string, ghost bool) error {
	release := s.squareRepo.ClearByOwner
	if ghost {
		release = s.squareRepo.GhostByOwner
	}

	squares, err := release(ctx, contestID, userID)
	if err != nil {
		return err
	}

	return s.publishSquares(ctx, contestID, actor, squares)
}

func (s *playerService) publishSquares(ctx context.Context, contestID uuid.UUID, actor string, squares []model.Square) error {
	for i := range squares {
		if err := s.events.PublishSquareUpdate(ctx, contestID, actor, &squares[i]); err != nil {
			return err
		}
	}
	return nil
}
