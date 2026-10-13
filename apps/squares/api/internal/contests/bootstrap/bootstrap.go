package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/consumer"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/migrations"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
)

const (
	Service = "contests"
	Schema  = "contests"

	// one advisory lock per schema keeps a single replica relaying, which preserves event order
	outboxLockKey int64 = 910101

	writeTimeout = 30 * time.Second
)

type App struct {
	Engine    *gin.Engine
	cfg       *model.ContestsConfig
	infra     *server.Infra
	relay     *messaging.Relay
	consumers []consumerBinding
}

type consumerBinding struct {
	spec    messaging.ConsumerSpec
	handler messaging.Handler
}

func Connect(ctx context.Context, cfg *model.ContestsConfig) (*server.Infra, error) {
	return server.Connect(ctx, &server.InfraConfig{
		DB:         &cfg.DB,
		Schema:     Schema,
		Migrations: migrations.FS,
		NATS:       cfg.NATS,
		Redis:      cfg.Redis,
	})
}

// the composition root: the only place concrete repositories, services, and handlers are built
func New(cfg *model.ContestsConfig, infra *server.Infra) *App {
	db := infra.DB
	tx := database.NewTransactor(db)
	relay := messaging.NewRelay(db, infra.JS, outboxLockKey)
	events := service.NewContestEventPublisher(messaging.NewOutbox(db, relay.Notify))
	sharedCache := cache.NewRedisCache(infra.Redis, Service)

	contestRepo := repository.NewContestRepository(db)
	participantRepo := repository.NewParticipantRepository(db)
	inviteRepo := repository.NewInviteRepository(db)
	gameRepo := repository.NewGameProjectionRepository(db)
	userRepo := repository.NewUserProjectionRepository(db)

	participantService := service.NewParticipantService(participantRepo, contestRepo, tx, events)
	contestService := service.NewContestService(contestRepo, participantRepo, gameRepo, userRepo, tx, events, participantService)
	inviteService := service.NewInviteService(inviteRepo, participantRepo, contestRepo, participantService, tx, events)
	leaderboardService := service.NewLeaderboardService(repository.NewLeaderboardRepository(db), sharedCache)
	statsService := service.NewStatsService(repository.NewStatsRepository(db), sharedCache)
	userActivityService := service.NewUserActivityService(userRepo, tx, events)
	gameSyncService := service.NewGameSyncService(gameRepo, contestRepo, contestService, tx)
	snapshotService := service.NewSnapshotService(contestRepo, participantService)

	engine := server.NewEngine(cfg.Server)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		"database": server.DatabaseCheck(db),
		"nats":     server.NATSCheck(infra.NATS),
		"redis":    server.RedisCheck(infra.Redis),
	}), Service)

	routes.Register(engine, &routes.Handlers{
		Contest:      handler.NewContestHandler(contestService),
		Participant:  handler.NewParticipantHandler(participantService),
		Invite:       handler.NewInviteHandler(inviteService),
		Leaderboard:  handler.NewLeaderboardHandler(leaderboardService),
		Stats:        handler.NewStatsHandler(statsService),
		UserActivity: handler.NewUserActivityHandler(userActivityService),
		Internal:     handler.NewInternalHandler(snapshotService, userActivityService),
	}, routes.Guards{
		Auth:       middleware.Authenticate(cache.NewRevocationStore(infra.Redis)),
		Idempotent: middleware.Idempotency(cache.NewIdempotencyStore(infra.Redis), Service),
		Internal:   middleware.RequireInternalToken(cfg.Internal.Token),
	})

	return &App{
		Engine: engine,
		cfg:    cfg,
		infra:  infra,
		relay:  relay,
		consumers: []consumerBinding{
			{spec: consumer.GamesSpec, handler: consumer.GameHandler(gameSyncService)},
			{spec: consumer.UsersSpec, handler: consumer.UserHandler(userActivityService)},
		},
	}
}

// relays the outbox and consumes game and user events until ctx ends or stop is called
func (a *App) Start(ctx context.Context) (stop func(), err error) {
	go a.relay.Run(ctx)

	stops := make([]func(), 0, len(a.consumers))
	stop = func() {
		for _, s := range stops {
			s()
		}
	}

	for _, c := range a.consumers {
		s, err := messaging.Consume(ctx, a.infra.JS, c.spec, c.handler)
		if err != nil {
			stop()
			return nil, fmt.Errorf("failed to start consumer %s: %w", c.spec.Durable, err)
		}
		stops = append(stops, s)
	}

	return stop, nil
}

// serves http alongside the background work in Start until ctx ends
func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	stop, err := a.Start(ctx)
	if err != nil {
		return err
	}
	defer stop()

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	err = server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, writeTimeout))
	slog.Info("contests service stopped")
	return err
}
