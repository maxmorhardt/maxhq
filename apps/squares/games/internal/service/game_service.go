package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"gorm.io/gorm"
)

const (
	upcomingCacheName = "upcoming_games"
	upcomingCacheKey  = "all"
	upcomingCacheTTL  = 60 * time.Second

	// ingest drops the entries a write touches, so these only bound how stale a missed drop can get
	scoreboardCacheName = "scoreboard"
	scoreboardCacheTTL  = 5 * time.Minute

	gameCacheName = "game"
	gameCacheTTL  = 5 * time.Minute
)

func scoreboardKey(week model.Week) string {
	return fmt.Sprintf("scoreboard:%d:%d:%d", week.Season, week.SeasonType, week.Week)
}

func gameKey(id uuid.UUID) string {
	return "game:" + id.String()
}

type GameService interface {
	GetUpcoming(ctx context.Context) ([]model.Game, error)
	GetScoreboard(ctx context.Context, week *model.Week) (*model.Scoreboard, error)
	GetGame(ctx context.Context, id uuid.UUID) (*model.Game, error)
	SaveCalendar(ctx context.Context, weeks []model.SeasonWeek) error
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
	log := logging.FromContext(ctx)

	games, err := cache.GetOrLoad(ctx, s.cache, upcomingCacheName, upcomingCacheKey, upcomingCacheTTL, s.gameRepo.GetUpcoming)
	if err != nil {
		log.Error("failed to get upcoming games", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return games, nil
}

// a nil week means the current one; live scores reach the page between refreshes over the games stream
func (s *gameService) GetScoreboard(ctx context.Context, week *model.Week) (*model.Scoreboard, error) {
	log := logging.FromContext(ctx)

	if week == nil {
		current, err := s.gameRepo.CurrentWeek(ctx)
		if err != nil {
			log.Error("failed to find the current week", "error", err)
			return nil, errs.ErrDatabaseUnavailable
		}
		if current == nil {
			return &model.Scoreboard{Games: []model.Game{}}, nil
		}
		week = current
	}

	key := scoreboardKey(*week)
	board, err := cache.GetOrLoad(ctx, s.cache, scoreboardCacheName, key, scoreboardCacheTTL, func(ctx context.Context) (*model.Scoreboard, error) {
		return s.loadScoreboard(ctx, *week)
	})
	if err != nil {
		log.Error("failed to get scoreboard", "week", key, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return board, nil
}

// a week's games, named and placed by ESPN's calendar when it lists the week
func (s *gameService) loadScoreboard(ctx context.Context, week model.Week) (*model.Scoreboard, error) {
	games, err := s.gameRepo.GetWeek(ctx, week)
	if err != nil {
		return nil, err
	}
	board := &model.Scoreboard{Week: week, Label: week.DefaultLabel(), Games: games}

	listed, err := s.gameRepo.GetSeasonWeek(ctx, week)
	if err != nil {
		return nil, err
	}
	if listed != nil {
		board.Label = listed.Label
		if board.Previous, board.Next, err = s.gameRepo.NeighborWeeks(ctx, listed); err != nil {
			return nil, err
		}
	}

	return board, nil
}

func (s *gameService) SaveCalendar(ctx context.Context, weeks []model.SeasonWeek) error {
	if err := s.gameRepo.SaveCalendar(ctx, weeks); err != nil {
		logging.FromContext(ctx).Error("failed to save the season calendar", "weeks", len(weeks), "error", err)
		return errs.ErrDatabaseUnavailable
	}
	return nil
}

// a contest page follows the score between loads over the game's stream
func (s *gameService) GetGame(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	log := logging.FromContext(ctx)

	game, err := cache.GetOrLoad(ctx, s.cache, gameCacheName, gameKey(id), gameCacheTTL, func(ctx context.Context) (*model.Game, error) {
		return s.gameRepo.GetByID(ctx, id)
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrGameNotFound
		}
		log.Error("failed to get game", "game_id", id, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return game, nil
}

func (s *gameService) Ingest(ctx context.Context, games []model.ESPNGame) (int, error) {
	log := logging.FromContext(ctx)

	newScores := 0
	// every cached view of a changed game goes, so reads see the write now rather than at expiry
	stale := map[string]bool{}
	for i := range games {
		eg := &games[i]

		var created int
		var stored *model.Game
		err := s.tx.Do(ctx, func(ctx context.Context) error {
			var err error
			created, stored, err = s.ingestOne(ctx, eg)
			return err
		})
		if err != nil {
			log.Error("failed to ingest game", "espn_id", eg.ESPNID, "error", err)
			continue
		}

		newScores += created
		if stored != nil {
			stale[upcomingCacheKey] = true
			stale[gameKey(stored.ID)] = true
			stale[scoreboardKey(model.Week{Season: stored.Season, SeasonType: stored.SeasonType, Week: stored.Week})] = true
		}
	}

	if len(stale) > 0 && s.cache != nil {
		keys := make([]string, 0, len(stale))
		for k := range stale {
			keys = append(keys, k)
		}
		if err := s.cache.Delete(ctx, keys...); err != nil {
			log.Warn("failed to invalidate cached games", "keys", len(keys), "error", err)
		}
	}

	return newScores, nil
}

// returns the stored game when it changed, nil when ESPN showed nothing new
func (s *gameService) ingestOne(ctx context.Context, eg *model.ESPNGame) (created int, stored *model.Game, err error) {
	game := util.ESPNGameToGame(eg)

	changed, err := s.gameRepo.Upsert(ctx, game)
	if err != nil {
		return 0, nil, err
	}

	for _, q := range util.CompletedQuarters(eg) {
		score := &model.GameScore{GameID: game.ID, Quarter: q.Quarter, HomeScore: q.Home, AwayScore: q.Away}
		isNew, scoreErr := s.gameRepo.UpsertScore(ctx, score)
		if scoreErr != nil {
			return 0, nil, scoreErr
		}
		if isNew {
			created++
		}
	}

	if !changed && created == 0 {
		return 0, nil, nil
	}

	stored, err = s.gameRepo.GetByID(ctx, game.ID)
	if err != nil {
		return 0, nil, err
	}

	if err := s.outbox.Add(ctx, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: toEvent(stored)}); err != nil {
		return 0, nil, err
	}

	return created, stored, nil
}

func (s *gameService) Activity(ctx context.Context) (model.GameActivity, error) {
	log := logging.FromContext(ctx)

	live, err := s.gameRepo.HasLiveGame(ctx)
	if err != nil {
		log.Error("failed to check for live games", "error", err)
		return model.GameActivity{}, errs.ErrDatabaseUnavailable
	}

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
