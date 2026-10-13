package service

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/util"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
)

const (
	upcomingCacheName = "upcoming_games"
	upcomingCacheKey  = "all"
	upcomingCacheTTL  = 60 * time.Second
)

type GameService interface {
	GetUpcoming(ctx context.Context) ([]model.Game, error)
	Ingest(ctx context.Context, games []model.ESPNGame) (newScores int, err error)
	Activity(ctx context.Context) (model.GameActivity, error)
}

type gameService struct {
	gameRepo repository.GameRepository
	tx       database.Transactor
	outbox   streams.Outbox
	cache    cache.Cache
}

func NewGameService(gameRepo repository.GameRepository, tx database.Transactor, outbox streams.Outbox, c cache.Cache) GameService {
	return &gameService{
		gameRepo: gameRepo,
		tx:       tx,
		outbox:   outbox,
		cache:    c,
	}
}

func (s *gameService) GetUpcoming(ctx context.Context) ([]model.Game, error) {
	log := reqctx.LoggerFromContext(ctx)

	games, err := cache.GetOrLoad(ctx, s.cache, upcomingCacheName, upcomingCacheKey, upcomingCacheTTL, s.gameRepo.GetUpcoming)
	if err != nil {
		log.Error("failed to get upcoming games", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return games, nil
}

// stores each scoreboard snapshot and emits game.updated for every game that actually changed
func (s *gameService) Ingest(ctx context.Context, games []model.ESPNGame) (int, error) {
	log := reqctx.LoggerFromContext(ctx)

	newScores := 0
	anyChanged := false
	for i := range games {
		eg := &games[i]

		var created int
		var changed bool
		err := s.tx.Do(ctx, func(ctx context.Context) error {
			var err error
			created, changed, err = s.ingestOne(ctx, eg)
			return err
		})
		if err != nil {
			log.Error("failed to ingest game", "espn_id", eg.ESPNID, "error", err)
			continue
		}

		newScores += created
		anyChanged = anyChanged || changed
	}

	// a new or rescheduled game must show up for contest creation now, not when the cached list expires
	if anyChanged && s.cache != nil {
		if err := s.cache.Delete(ctx, upcomingCacheKey); err != nil {
			log.Warn("failed to invalidate upcoming games cache", "error", err)
		}
	}

	return newScores, nil
}

// stores one game and its completed quarters; published reports whether anything changed and was emitted
func (s *gameService) ingestOne(ctx context.Context, eg *model.ESPNGame) (created int, published bool, err error) {
	game := util.ESPNGameToGame(eg)

	changed, err := s.gameRepo.Upsert(ctx, game)
	if err != nil {
		return 0, false, err
	}

	// record each newly completed quarter's cumulative score
	for _, q := range util.CompletedQuarters(eg) {
		score := &model.GameScore{GameID: game.ID, Quarter: q.Quarter, HomeScore: q.Home, AwayScore: q.Away}
		isNew, scoreErr := s.gameRepo.UpsertScore(ctx, score)
		if scoreErr != nil {
			return 0, false, scoreErr
		}
		if isNew {
			created++
		}
	}

	if !changed && created == 0 {
		return 0, false, nil
	}

	// publish the stored game with every score so far; contests rebuilds its copy from this alone
	stored, err := s.gameRepo.GetByID(ctx, game.ID)
	if err != nil {
		return 0, false, err
	}

	if err := s.outbox.Add(ctx, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: toEvent(stored)}); err != nil {
		return 0, false, err
	}

	return created, true, nil
}

func (s *gameService) Activity(ctx context.Context) (model.GameActivity, error) {
	log := reqctx.LoggerFromContext(ctx)

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

// the published shape is the contract with contests, so it is built field by field rather than reusing the table model
func toEvent(g *model.Game) events.Game {
	scores := make([]events.GameScore, 0, len(g.Scores))
	for _, sc := range g.Scores {
		scores = append(scores, events.GameScore{ID: sc.ID, Quarter: sc.Quarter, HomeScore: sc.HomeScore, AwayScore: sc.AwayScore})
	}

	return events.Game{
		ID:         g.ID,
		ESPNID:     g.ESPNID,
		HomeTeam:   g.HomeTeam,
		AwayTeam:   g.AwayTeam,
		HomeAbbr:   g.HomeAbbr,
		AwayAbbr:   g.AwayAbbr,
		GameTime:   g.GameTime,
		Week:       g.Week,
		Season:     g.Season,
		SeasonType: g.SeasonType,
		Status:     string(g.Status),
		Period:     g.Period,
		HomeScore:  g.HomeScore,
		AwayScore:  g.AwayScore,
		Scores:     scores,
		UpdatedAt:  g.UpdatedAt,
	}
}
