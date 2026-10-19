package bootstrap

import (
	"context"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/handler"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/migrations"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/routes"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/worker"
	"github.com/maxmorhardt/maxhq/libs/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/platform/middleware"
	"github.com/maxmorhardt/maxhq/libs/platform/server"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
)

const (
	Service = "games"
	Schema  = "games"

	KeyPrefix = "squares"

	outboxLockKey int64 = 910102

	writeTimeout = 30 * time.Second
)

type App struct {
	Engine *gin.Engine
	cfg    *model.GamesConfig
	infra  *server.Infra
	relay  *streams.Relay
	runner worker.Runner
}

func Connect(cfg *model.GamesConfig) (*server.Infra, error) {
	return server.Connect(&server.InfraConfig{
		DB:            &cfg.DB,
		Schema:        Schema,
		Migrations:    migrations.FS,
		Redis:         cfg.Redis,
		KeyPrefix:     KeyPrefix,
		RedisOptional: true,
	})
}

func New(cfg *model.GamesConfig, infra *server.Infra) *App {
	db := infra.DB
	relay := streams.NewRelay(db, infra.Redis, outboxLockKey, cfg.Streams.Retention)

	gameService := service.NewGameService(
		repository.NewGameRepository(db),
		database.NewTransactor(db),
		streams.NewOutbox(db, relay.Notify),
		cache.NewRedisCache(infra.Redis, Service),
	)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"database": server.DatabaseCheck(db),
	}), Service)
	routes.Register(engine, handler.NewGameHandler(gameService), middleware.Authenticate(cache.NewRevocationStore(infra.Redis)))

	var runner worker.Runner
	if cfg.Worker.Enabled {
		runner = worker.NewRunner(db, gameService, cfg.Worker)
	}

	return &App{Engine: engine, cfg: cfg, infra: infra, relay: relay, runner: runner}
}

func (a *App) Start(ctx context.Context) {
	go a.relay.Run(ctx)

	if a.runner == nil {
		slog.Info("scores worker disabled")
		return
	}

	a.runner.Start(logging.NewContext(ctx, slog.Default().With("component", "scores-worker")))
	slog.Info("scores worker started", "active_interval", a.cfg.Worker.ActiveInterval, "idle_interval", a.cfg.Worker.IdleInterval)
}

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
