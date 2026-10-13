package bootstrap

import (
	"context"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/migrations"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/maxmorhardt/maxstash/libs/platform/server"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
)

const (
	Service = "accounts"
	Schema  = "accounts"

	// every key and stream this service touches starts with this; the redis acl is scoped to it
	KeyPrefix = "squares"

	// one advisory lock per schema keeps a single replica relaying, which preserves event order
	outboxLockKey int64 = 910103

	contactWindow = 24 * time.Hour
	writeTimeout  = 30 * time.Second
)

type App struct {
	Engine      *gin.Engine
	cfg         *model.AccountsConfig
	infra       *server.Infra
	relay       *streams.Relay
	userService service.UserService
}

func Connect(cfg *model.AccountsConfig) (*server.Infra, error) {
	return server.Connect(&server.InfraConfig{
		DB:         &cfg.DB,
		Schema:     Schema,
		Migrations: migrations.FS,
		Redis:      cfg.Redis,
		KeyPrefix:  KeyPrefix,
		// requests and outbox writes work without redis, so a redis outage must not stop a restart
		RedisOptional: true,
	})
}

func New(cfg *model.AccountsConfig, infra *server.Infra) *App {
	db := infra.DB
	relay := streams.NewRelay(db, infra.Redis, outboxLockKey, cfg.Streams.Retention)
	revocations := cache.NewRevocationStore(infra.Redis)

	userService := service.NewUserService(
		repository.NewUserRepository(db),
		database.NewTransactor(db),
		streams.NewOutbox(db, relay.Notify),
		clients.NewContestActivityClient(cfg.Contests.URL, cfg.Internal.Token),
		revocations,
	)
	contactService := service.NewContactService(repository.NewContactRepository(db), cfg.SMTP, cfg.Turnstile)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		// redis is left out on purpose: without it requests still work and events wait in the outbox
		"database": server.DatabaseCheck(db),
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
