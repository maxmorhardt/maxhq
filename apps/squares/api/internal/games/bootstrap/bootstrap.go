package bootstrap

import (
	"context"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/migrations"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/worker"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

const (
	Service = "games"
	Schema  = "games"

	// one advisory lock per schema keeps a single replica relaying, which preserves event order
	outboxLockKey int64 = 910102

	writeTimeout = 30 * time.Second
)

type App struct {
	Engine *gin.Engine
	cfg    *model.GamesConfig
	infra  *server.Infra
	relay  *messaging.Relay
	runner worker.Runner
}

func Connect(ctx context.Context, cfg *model.GamesConfig) (*server.Infra, error) {
	return server.Connect(ctx, &server.InfraConfig{
		DB:         &cfg.DB,
		Schema:     Schema,
		Migrations: migrations.FS,
		NATS:       cfg.NATS,
		Redis:      cfg.Redis,
	})
}

func New(cfg *model.GamesConfig, infra *server.Infra) *App {
	db := infra.DB
	relay := messaging.NewRelay(db, infra.JS, outboxLockKey)

	gameService := service.NewGameService(
		repository.NewGameRepository(db),
		database.NewTransactor(db),
		messaging.NewOutbox(db, relay.Notify),
		cache.NewRedisCache(infra.Redis, Service),
	)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"database": server.DatabaseCheck(db),
		"nats":     server.NATSCheck(infra.NATS),
		"redis":    server.RedisCheck(infra.Redis),
	}), Service)
	routes.Register(engine, handler.NewGameHandler(gameService), middleware.Authenticate(cache.NewRevocationStore(infra.Redis)))

	var runner worker.Runner
	if cfg.Worker.Enabled {
		runner = worker.NewRunner(db, gameService, cfg.Worker)
	}

	return &App{Engine: engine, cfg: cfg, infra: infra, relay: relay, runner: runner}
}

// polls espn on the replica holding the scores lock and relays game events until ctx ends
func (a *App) Start(ctx context.Context) {
	go a.relay.Run(ctx)

	if a.runner == nil {
		slog.Info("scores worker disabled")
		return
	}

	a.runner.Start(util.ContextWithLogger(ctx, slog.Default().With("component", "scores-worker")))
	slog.Info("scores worker started", "active_interval", a.cfg.Worker.ActiveInterval, "idle_interval", a.cfg.Worker.IdleInterval)
}

// serves the upcoming games list alongside the background work in Start until ctx ends
func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	a.Start(ctx)

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	err := server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, writeTimeout))
	slog.Info("games service stopped")
	return err
}
