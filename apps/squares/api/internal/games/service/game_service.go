package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

const upcomingCacheTTL = 60 * time.Second

type GameService interface {
	GetUpcoming(ctx context.Context) ([]model.Game, error)
	Ingest(ctx context.Context, games []model.ESPNGame) (newScores int, err error)
	Activity(ctx context.Context) (model.GameActivity, error)
}

type gameService struct {
	gameRepo repository.GameRepository
	tx       database.Transactor
	outbox   messaging.Outbox
	cache    cache.Cache
}

func NewGameService(gameRepo repository.GameRepository, tx database.Transactor, outbox messaging.Outbox, c cache.Cache) GameService {
	return &gameService{
		gameRepo: gameRepo,
		tx:       tx,
		outbox:   outbox,
		cache:    c,
	}
}

func (s *gameService) GetUpcoming(ctx context.Context) ([]model.Game, error) {
	log := util.LoggerFromContext(ctx)

	games, err := cache.GetOrLoad(ctx, s.cache, "upcoming_games", "all", upcomingCacheTTL, s.gameRepo.GetUpcoming)
	if err != nil {
		log.Error("failed to get upcoming games", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return games, nil
}

// stores each scoreboard snapshot and emits game.updated for every game that actually changed
func (s *gameService) Ingest(ctx context.Context, games []model.ESPNGame) (int, error) {
	log := util.LoggerFromContext(ctx)

	newScores := 0
	for i := range games {
		eg := &games[i]

		var created int
		err := s.tx.Do(ctx, func(ctx context.Context) error {
			var err error
			created, err = s.ingestOne(ctx, eg)
			return err
		})
		if err != nil {
			log.Error("failed to ingest game", "espn_id", eg.ESPNID, "error", err)
			continue
		}

		newScores += created
	}

	return newScores, nil
}

func (s *gameService) ingestOne(ctx context.Context, eg *model.ESPNGame) (int, error) {
	game := util.ESPNGameToGame(eg)

	changed, err := s.gameRepo.Upsert(ctx, game)
	if err != nil {
		return 0, err
	}

	// record each newly completed quarter's cumulative score
	created := 0
	for _, q := range util.CompletedQuarters(eg) {
		score := &model.GameScore{GameID: game.ID, Quarter: q.Quarter, HomeScore: q.Home, AwayScore: q.Away}
		isNew, scoreErr := s.gameRepo.UpsertScore(ctx, score)
		if scoreErr != nil {
			return 0, scoreErr
		}
		if isNew {
			created++
		}
	}

	if !changed && created == 0 {
		return 0, nil
	}

	// publish the stored game with every score so far; contests rebuilds its copy from this alone
	stored, err := s.gameRepo.GetByID(ctx, game.ID)
	if err != nil {
		return 0, err
	}

	if err := s.outbox.Add(ctx, events.GameSubject(stored.ID), events.GameUpdated{Game: *stored}); err != nil {
		return 0, err
	}

	return created, nil
}

func (s *gameService) Activity(ctx context.Context) (model.GameActivity, error) {
	log := util.LoggerFromContext(ctx)

	// a live game means the worker should poll aggressively
	live, err := s.gameRepo.HasLiveGame(ctx)
	if err != nil {
		log.Error("failed to check for live games", "error", err)
		return model.GameActivity{}, errs.ErrDatabaseUnavailable
	}

	// otherwise the next kickoff tells the worker when to ramp back up
	kickoff, err := s.gameRepo.NextKickoff(ctx)
	if err != nil {
		log.Error("failed to get next kickoff", "error", err)
		return model.GameActivity{}, errs.ErrDatabaseUnavailable
	}

	return model.GameActivity{Live: live, NextKickoff: kickoff}, nil
}
