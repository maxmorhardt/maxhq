package worker

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/clients"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
)

// spaces out the season sync's requests so a full season is not a burst
const weekPause = 200 * time.Millisecond

// the weeks to look for when the next season's calendar is not out yet
const nextSeasonWeeks = 18

type scoresWorker struct {
	espn           clients.ESPNClient
	gameService    service.GameService
	activeInterval time.Duration
	idleInterval   time.Duration
	weekPause      time.Duration
	lastSeasonSync time.Time
}

func newScoresWorker(espn clients.ESPNClient, gameService service.GameService, activeInterval, idleInterval time.Duration) *scoresWorker {
	return &scoresWorker{
		espn:           espn,
		gameService:    gameService,
		activeInterval: activeInterval,
		idleInterval:   idleInterval,
		weekPause:      weekPause,
	}
}

// every run follows the current scoreboard; every idle interval it also syncs the whole season,
// which backfills past weeks and loads the schedule ahead
func (w *scoresWorker) run(ctx context.Context) error {
	log := logging.FromContext(ctx)
	now := time.Now()

	current, cal, err := w.espn.FetchCurrent(ctx)
	if err != nil {
		return err
	}

	games := current
	var calendar []model.SeasonWeek
	synced := false
	if now.Sub(w.lastSeasonSync) >= w.idleInterval {
		season, weeks, syncErr := w.seasonGames(ctx, cal, now)
		if syncErr != nil {
			// the current scores still go in; the season sync tries again next run
			log.Warn("season sync failed", "season", cal.Season, "error", syncErr)
		} else {
			// the current scoreboard is the freshest view of this week, so it wins over the sync
			games = merge(season, current)
			calendar = weeks
			synced = true
		}
	}

	newScores, err := w.gameService.Ingest(ctx, games)
	if err != nil {
		return err
	}

	if synced {
		if err := w.gameService.SaveCalendar(ctx, calendar); err != nil {
			return err
		}
		w.lastSeasonSync = now
		log.Info("synced the season", "season", cal.Season, "games", len(games))
	}

	if newScores > 0 {
		log.Info("recorded new quarter scores", "count", newScores)
		metrics.AddScoresRecorded(newScores)
	}

	return nil
}

// the season's games and calendar, plus the next season's once the postseason is over and ESPN has published it
func (w *scoresWorker) seasonGames(ctx context.Context, cal model.ESPNCalendar, now time.Time) ([]model.ESPNGame, []model.SeasonWeek, error) {
	games, err := w.fetchWeeks(ctx, weeksOf(cal.Weeks))
	if err != nil {
		return nil, nil, err
	}
	calendar := cal.Weeks

	if !cal.End.IsZero() && now.After(cal.End) {
		next, nextCalendar, err := w.nextSeasonGames(ctx, cal.Season+1)
		if err != nil {
			return nil, nil, err
		}
		games = append(games, next...)
		calendar = append(calendar, nextCalendar...)
	}

	return games, calendar, nil
}

func (w *scoresWorker) nextSeasonGames(ctx context.Context, season int) ([]model.ESPNGame, []model.SeasonWeek, error) {
	first := model.Week{Season: season, SeasonType: 2, Week: 1}
	opener, cal, err := w.espn.FetchWeek(ctx, first)
	if err != nil {
		return nil, nil, err
	}
	if len(inWeek(opener, first)) == 0 {
		return nil, nil, nil
	}

	// a calendar is only kept when ESPN answered with the new season's own
	var calendar []model.SeasonWeek
	weeks := make([]model.Week, 0, nextSeasonWeeks)
	if cal.Season == season && len(cal.Weeks) > 0 {
		calendar = cal.Weeks
		weeks = weeksOf(cal.Weeks)
	} else {
		for week := 1; week <= nextSeasonWeeks; week++ {
			weeks = append(weeks, model.Week{Season: season, SeasonType: 2, Week: week})
		}
	}

	games, err := w.fetchWeeks(ctx, weeks)
	if err != nil {
		return nil, nil, err
	}
	return games, calendar, nil
}

func weeksOf(calendar []model.SeasonWeek) []model.Week {
	weeks := make([]model.Week, 0, len(calendar))
	for i := range calendar {
		weeks = append(weeks, calendar[i].Week)
	}
	return weeks
}

func (w *scoresWorker) fetchWeeks(ctx context.Context, weeks []model.Week) ([]model.ESPNGame, error) {
	games := make([]model.ESPNGame, 0, len(weeks)*16)
	for i, week := range weeks {
		if i > 0 && w.weekPause > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(w.weekPause):
			}
		}

		found, _, err := w.espn.FetchWeek(ctx, week)
		if err != nil {
			return nil, err
		}
		games = append(games, inWeek(found, week)...)
	}

	return games, nil
}

// ESPN answers a week it has no schedule for with whatever it has, so keep only that week's games
func inWeek(games []model.ESPNGame, week model.Week) []model.ESPNGame {
	kept := games[:0:0]
	for i := range games {
		g := &games[i]
		if g.Season == week.Season && g.SeasonType == week.SeasonType && g.Week == week.Week {
			kept = append(kept, *g)
		}
	}
	return kept
}

// one entry per game, the later list winning
func merge(lists ...[]model.ESPNGame) []model.ESPNGame {
	index := make(map[string]int)
	merged := make([]model.ESPNGame, 0)
	for _, list := range lists {
		for i := range list {
			if j, ok := index[list[i].ESPNID]; ok {
				merged[j] = list[i]
				continue
			}
			index[list[i].ESPNID] = len(merged)
			merged = append(merged, list[i])
		}
	}
	return merged
}

func (w *scoresWorker) nextDelay(ctx context.Context) time.Duration {
	// derive pacing from shared DB state so every replica agrees, lock holder or not
	act, err := w.gameService.Activity(ctx)
	if err != nil {
		return w.activeInterval
	}

	if act.Live {
		return w.activeInterval
	}

	if !act.NextKickoff.IsZero() {
		until := time.Until(act.NextKickoff)
		switch {
		case until <= w.activeInterval:
			return w.activeInterval
		case until < w.idleInterval:
			return until
		}
	}

	return w.idleInterval
}
