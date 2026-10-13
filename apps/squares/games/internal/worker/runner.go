package worker

import (
	"context"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"gorm.io/gorm"
)

type Runner interface {
	Start(ctx context.Context)
}

const failureLogThreshold = 3

type runner struct {
	db                  *gorm.DB
	worker              *scoresWorker
	lockKey             int64
	consecutiveFailures int
}

func NewRunner(db *gorm.DB, gameService service.GameService, cfg model.WorkerConfig) Runner {
	espn := clients.NewESPNClient(cfg.ESPNBaseURL)
	return &runner{
		db:      db,
		worker:  newScoresWorker(espn, gameService, cfg.ActiveInterval, cfg.IdleInterval),
		lockKey: cfg.LockKey,
	}
}

func (r *runner) Start(ctx context.Context) {
	ctx = logging.NewContext(ctx, logging.FromContext(ctx).With("job", "scores"))
	go r.loop(ctx)
}

func (r *runner) loop(ctx context.Context) {
	r.runGuarded(ctx)

	for {
		delay := r.worker.nextDelay(ctx)

		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
			r.runGuarded(ctx)
		}
	}
}

func (r *runner) runGuarded(ctx context.Context) {
	log := logging.FromContext(ctx)

	// pin a single connection so the advisory lock lives on one session
	sqlDB, err := r.db.DB()
	if err != nil {
		log.Error("failed to get sql db for advisory lock", "error", err)
		return
	}

	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		log.Error("failed to acquire connection for advisory lock", "error", err)
		return
	}
	defer func() { _ = conn.Close() }()

	var locked bool
	if err := conn.QueryRowContext(ctx, "SELECT pg_try_advisory_lock($1)", r.lockKey).Scan(&locked); err != nil {
		log.Error("failed to acquire advisory lock", "error", err)
		return
	}
	if !locked {
		return
	}
	defer func() {
		// unlock on a fresh context so shutdown cancellation can't leave it held
		unlockCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if _, err := conn.ExecContext(unlockCtx, "SELECT pg_advisory_unlock($1)", r.lockKey); err != nil {
			log.Error("failed to release advisory lock", "error", err)
		}
	}()

	if err := r.worker.run(ctx); err != nil {
		r.consecutiveFailures++
		if r.consecutiveFailures >= failureLogThreshold {
			log.Error("scores job failed", "error", err, "consecutive_failures", r.consecutiveFailures)
		} else {
			log.Warn("scores job failed, will retry next interval", "error", err)
		}
		metrics.IncScoresRun(false)
		return
	}

	if r.consecutiveFailures >= failureLogThreshold {
		log.Info("scores job recovered", "after_failures", r.consecutiveFailures)
	}
	r.consecutiveFailures = 0
	metrics.IncScoresRun(true)
}
