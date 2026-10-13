package worker

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
)

const scheduleWindow = 10 * 24 * time.Hour
const scheduleLookback = 3 * 24 * time.Hour
const espnDateLayout = "20060102"

type scoresWorker struct {
	espn             clients.ESPNClient
	gameService      service.GameService
	activeInterval   time.Duration
	idleInterval     time.Duration
	lastScheduleSync time.Time
}

func newScoresWorker(espn clients.ESPNClient, gameService service.GameService, activeInterval, idleInterval time.Duration) *scoresWorker {
	return &scoresWorker{
		espn:           espn,
		gameService:    gameService,
		activeInterval: activeInterval,
		idleInterval:   idleInterval,
	}
}

func (w *scoresWorker) run(ctx context.Context) error {
	now := time.Now()

	wide := now.Sub(w.lastScheduleSync) >= w.idleInterval
	var dates []string
	if wide {
		dates = scoreboardDates(now)
	}

	games, err := w.espn.FetchScoreboard(ctx, dates)
	if err != nil {
		return err
	}

	newScores, err := w.gameService.Ingest(ctx, games)
	if err != nil {
		return err
	}

	if wide {
		w.lastScheduleSync = now
	}

	if newScores > 0 {
		logging.FromContext(ctx).Info("recorded new quarter scores", "count", newScores)
		metrics.AddScoresRecorded(newScores)
	}

	return nil
}

func scoreboardDates(now time.Time) []string {
	start := now.Add(-scheduleLookback)
	days := int((scheduleLookback+scheduleWindow)/(24*time.Hour)) + 1

	dates := make([]string, 0, days)
	for i := range days {
		dates = append(dates, start.AddDate(0, 0, i).Format(espnDateLayout))
	}

	return dates
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
