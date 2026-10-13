package bootstrap

import (
	"context"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/migrations"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
)

const (
	Service = "accounts"
	Schema  = "accounts"

	// one advisory lock per schema keeps a single replica relaying, which preserves event order
	outboxLockKey int64 = 910103

	contactWindow = 24 * time.Hour
	writeTimeout  = 30 * time.Second
)

type App struct {
	Engine      *gin.Engine
	cfg         *model.AccountsConfig
	infra       *server.Infra
	relay       *messaging.Relay
	userService service.UserService
}

func Connect(ctx context.Context, cfg *model.AccountsConfig) (*server.Infra, error) {
	return server.Connect(ctx, &server.InfraConfig{
		DB:         &cfg.DB,
		Schema:     Schema,
		Migrations: migrations.FS,
		NATS:       cfg.NATS,
		Redis:      cfg.Redis,
	})
}

func New(cfg *model.AccountsConfig, infra *server.Infra) *App {
	db := infra.DB
	relay := messaging.NewRelay(db, infra.JS, outboxLockKey)
	revocations := cache.NewRevocationStore(infra.Redis)

	userService := service.NewUserService(
		repository.NewUserRepository(db),
		database.NewTransactor(db),
		messaging.NewOutbox(db, relay.Notify),
		clients.NewContestActivityClient(cfg.Internal.ContestsURL, cfg.Internal.Token),
		revocations,
	)
	contactService := service.NewContactService(repository.NewContactRepository(db), cfg.SMTP, cfg.Turnstile)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"database": server.DatabaseCheck(db),
		"nats":     server.NATSCheck(infra.NATS),
		"redis":    server.RedisCheck(infra.Redis),
	}), Service)

	routes.Register(engine, routes.Handlers{
		User:    handler.NewUserHandler(userService),
		Contact: handler.NewContactHandler(contactService),
	}, routes.Guards{
		Auth:         middleware.Authenticate(revocations),
		Idempotent:   middleware.Idempotency(cache.NewIdempotencyStore(infra.Redis), Service),
		ContactLimit: middleware.RateLimit(cache.NewRateLimiter(infra.Redis), "contact", cfg.Contact.RateLimit, contactWindow),
	})

	return &App{Engine: engine, cfg: cfg, infra: infra, relay: relay, userService: userService}
}

// restores revocations to redis and relays user events until ctx ends
func (a *App) Start(ctx context.Context) {
	// a redis that lost its data must not let deleted accounts back in
	if err := a.userService.SyncRevocations(ctx); err != nil {
		slog.Error("failed to sync revocations on startup", "error", err)
	}

	go a.relay.Run(ctx)
}

func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	a.Start(ctx)

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	err := server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, writeTimeout))
	slog.Info("accounts service stopped")
	return err
}
