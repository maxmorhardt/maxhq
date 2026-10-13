package bootstrap

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/service"
)

const Service = "realtime"

type App struct {
	Engine *gin.Engine
	cfg    *model.RealtimeConfig
	infra  *server.Infra
}

// realtime owns no data: it reads the jetstream stream and asks contests who may watch
func Connect(ctx context.Context, cfg *model.RealtimeConfig) (*server.Infra, error) {
	return server.Connect(ctx, &server.InfraConfig{
		NATS:  cfg.NATS,
		Redis: cfg.Redis,
	})
}

// shutdown should be closed when the process starts draining, so open streams end and clients move to another replica
func New(cfg *model.RealtimeConfig, infra *server.Infra, shutdown <-chan struct{}) *App {
	revocations := cache.NewRevocationStore(infra.Redis)
	streams := service.NewStreamService(
		infra.JS,
		clients.NewContestAccessClient(cfg.Internal.ContestsURL, cfg.Internal.Token),
		revocations,
	)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"nats":  server.NATSCheck(infra.NATS),
		"redis": server.RedisCheck(infra.Redis),
	}), Service)
	routes.Register(engine, handler.NewEventsHandler(streams, cfg.Stream, shutdown), middleware.Authenticate(revocations))

	return &App{Engine: engine, cfg: cfg, infra: infra}
}

func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	// no write timeout: streams stay open for as long as the viewer's token is valid
	err := server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, 0))
	slog.Info("realtime service stopped")
	return err
}
