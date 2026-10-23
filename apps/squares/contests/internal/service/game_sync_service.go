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
	"gorm.io/gorm"
)

type GameSyncService interface {
	ApplyGameUpdate(ctx context.Context, game *model.Game) error
}

type gameSyncService struct {
	gameRepo       repository.GameProjectionRepository
	contestRepo    repository.ContestRepository
	contestService ContestService
	tx             database.Transactor
	feed           FeedService
}

func NewGameSyncService(
	gameRepo repository.GameProjectionRepository,
	contestRepo repository.ContestRepository,
	contestService ContestService,
	tx database.Transactor,
	feed FeedService,
) GameSyncService {
	return &gameSyncService{
		gameRepo:       gameRepo,
		contestRepo:    contestRepo,
		contestService: contestService,
		tx:             tx,
		feed:           feed,
	}
}

func (s *gameSyncService) ApplyGameUpdate(ctx context.Context, game *model.Game) error {
	log := logging.FromContext(ctx).With("game_id", game.ID)

	// one transaction keeps the read-back on the primary; the replica can lag the write and miss the new quarter
	var stored *model.Game
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.gameRepo.Upsert(ctx, game); err != nil {
			log.Error("failed to update game projection", "error", err)
			return err
		}

		if game.Status == model.GameStatusScheduled {
			return nil
		}

		var err error
		if stored, err = s.gameRepo.GetByID(ctx, game.ID); err != nil {
			log.Error("failed to reload game projection", "error", err)
			return err
		}
		return nil
	})
	if err != nil || stored == nil {
		return err
	}

	contestIDs, err := s.contestRepo.GetIDsByGameID(ctx, game.ID)
	if err != nil {
		log.Error("failed to get contests for game", "error", err)
		return err
	}

	// one bad contest must not block the rest, but the event is retried so it gets another chance
	var firstErr error
	for _, contestID := range contestIDs {
		if err := s.reconcileContest(ctx, contestID, stored); err != nil {
			log.Error("failed to reconcile contest with game", "contest_id", contestID, "error", err)
			if firstErr == nil {
				firstErr = err
			}
		}
		s.feed.InvalidateContest(ctx, contestID)
	}

	return firstErr
}

func (s *gameSyncService) reconcileContest(ctx context.Context, contestID uuid.UUID, game *model.Game) error {
	return s.tx.Do(ctx, func(ctx context.Context) error {
		contest, err := s.contestRepo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}

		if contest.Status == model.ContestStatusDeleted {
			return nil
		}

		return s.reconcile(ctx, contest, game)
	})
}

// idempotent: replaying the same game state leaves the contest where it already is
func (s *gameSyncService) reconcile(ctx context.Context, contest *model.Contest, game *model.Game) error {
	log := logging.FromContext(ctx)

	if contest.Status.IsTerminal() {
		return nil
	}

	if contest.Status == model.ContestStatusActive {
		switch {
		case game.Status == model.GameStatusFinal:
			return s.contestService.FinalizeFromScores(ctx, contest, game.Scores)
		case game.Status == model.GameStatusInProgress && util.AllSquaresClaimed(contest):
			if err := s.contestService.AutoStart(ctx, contest); err != nil {
				return err
			}
		default:
			return nil
		}
	}

	currentQuarter, ok := contest.Status.Quarter()
	if !ok {
		return nil
	}

	for i := range game.Scores {
		score := game.Scores[i]
		if score.Quarter < currentQuarter {
			continue
		}

		result, err := s.contestService.ApplyQuarterResult(ctx, contest, score.Quarter, score.HomeScore, score.AwayScore)
		if err != nil {
			if errors.Is(err, errs.ErrWinnerNotDeterminable) || errors.Is(err, errs.ErrInvalidQuarter) {
				log.Warn("skipping quarter", "contest_id", contest.ID, "quarter", score.Quarter, "error", err)
				continue
			}
			return err
		}

		currentQuarter = score.Quarter + 1
		log.Info("applied quarter result", "contest_id", contest.ID, "game_id", game.ID, "quarter", score.Quarter, "winner", result.Winner)
	}

	return nil
}
