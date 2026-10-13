package bootstrap

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/maxmorhardt/maxstash/libs/platform/server"
)

const (
	Service = "realtime"

	// every key and stream this service touches starts with this; the redis acl is scoped to it
	KeyPrefix = "squares"
)

type App struct {
	Engine *gin.Engine
	cfg    *model.RealtimeConfig
	infra  *server.Infra
	hub    *service.Hub
}

func Connect(cfg *model.RealtimeConfig) (*server.Infra, error) {
	return server.Connect(&server.InfraConfig{
		Redis:     cfg.Redis,
		KeyPrefix: KeyPrefix,
	})
}

// shutdown should be closed when the process starts draining, so open streams end and clients move to another replica
func New(cfg *model.RealtimeConfig, infra *server.Infra, shutdown <-chan struct{}) *App {
	revocations := cache.NewRevocationStore(infra.Redis)
	hub := service.NewHub(infra.Redis)
	streams := service.NewStreamService(
		infra.Redis,
		hub,
		clients.NewContestAccessClient(cfg.Contests.URL, cfg.Internal.Token),
		revocations,
	)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"redis": server.RedisCheck(infra.Redis),
	}), Service)
	routes.Register(engine, handler.NewEventsHandler(streams, cfg.Stream, shutdown), middleware.Authenticate(revocations))

	return &App{Engine: engine, cfg: cfg, infra: infra, hub: hub}
}

// reads the contest streams for every open stream on this replica until ctx ends
func (a *App) Start(ctx context.Context) {
	go a.hub.Run(logging.NewContext(ctx, slog.Default()))
}

func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	a.Start(ctx)

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	// no write timeout: streams stay open for as long as the viewer's token is valid
	err := server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, 0))
	slog.Info("realtime service stopped")
	return err
}
