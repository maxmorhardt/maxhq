package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"gorm.io/gorm"
)

// applies game events from the games service: refresh the local copy, then move linked contests forward
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

	if err := s.gameRepo.Upsert(ctx, game); err != nil {
		log.Error("failed to update game projection", "error", err)
		return err
	}

	// scheduled games have nothing to apply yet; only reconcile once play starts
	if game.Status == model.GameStatusScheduled {
		return nil
	}

	// reconcile against the stored copy, which merges every score seen so far
	stored, err := s.gameRepo.GetByID(ctx, game.ID)
	if err != nil {
		log.Error("failed to reload game projection", "error", err)
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

		return s.reconcile(ctx, contest, game)
	})
}

// idempotent: replaying the same game state leaves the contest where it already is
func (s *gameSyncService) reconcile(ctx context.Context, contest *model.Contest, game *model.Game) error {
	log := logging.FromContext(ctx)

	if contest.Status.IsTerminal() {
		return nil
	}

	// an ACTIVE contest hasn't locked its grid yet
	if contest.Status == model.ContestStatusActive {
		switch {
		case game.Status == model.GameStatusFinal:
			// the game ended before the grid ever locked; finalize straight from the final scores
			return s.contestService.FinalizeFromScores(ctx, contest, game.Scores)
		case game.Status == model.GameStatusInProgress && util.AllSquaresClaimed(contest):
			// full grid at kickoff; lock, randomize, and score live
			if err := s.contestService.AutoStart(ctx, contest); err != nil {
				return err
			}
		default:
			// grid stays fillable until it fills up or the game ends
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
			// a score this grid can't resolve shouldn't stall the quarters after it
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
