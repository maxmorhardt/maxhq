package bootstrap

import (
	"context"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/consumer"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/handler"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/migrations"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/routes"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/maxmorhardt/maxstash/libs/platform/server"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
)

const (
	Service = "contests"
	Schema  = "contests"

	// every key and stream this service touches starts with this; the redis acl is scoped to it
	KeyPrefix = "squares"

	// one advisory lock per schema keeps a single replica relaying, which preserves event order
	outboxLockKey int64 = 910101

	writeTimeout = 30 * time.Second
)

type App struct {
	Engine    *gin.Engine
	cfg       *model.ContestsConfig
	infra     *server.Infra
	relay     *streams.Relay
	consumers []*streams.Consumer
}

func Connect(cfg *model.ContestsConfig) (*server.Infra, error) {
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

// the composition root: the only place concrete repositories, services, and handlers are built
func New(cfg *model.ContestsConfig, infra *server.Infra) *App {
	db := infra.DB
	tx := database.NewTransactor(db)
	relay := streams.NewRelay(db, infra.Redis, outboxLockKey, cfg.Streams.Retention)
	events := service.NewContestEventPublisher(streams.NewOutbox(db, relay.Notify))
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
	feedService := service.NewFeedService(repository.NewFeedRepository(db), sharedCache)
	gameSyncService := service.NewGameSyncService(gameRepo, contestRepo, contestService, tx, feedService)
	snapshotService := service.NewSnapshotService(contestRepo, participantService)

	engine := server.NewEngine(cfg.Server)
	server.RegisterValidation("contestname", handler.ValidateContestName)
	server.RegisterRootRoutes(engine, server.NewHealthHandler(map[string]server.Check{
		// redis is left out on purpose: without it requests still work and events wait in the outbox
		"database": server.DatabaseCheck(db),
	}), Service)

	routes.Register(engine, &routes.Handlers{
		Contest:      handler.NewContestHandler(contestService),
		Feed:         handler.NewFeedHandler(feedService),
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
		FeedWrite:  handler.InvalidateFeeds(feedService),
	})

	return &App{
		Engine: engine,
		cfg:    cfg,
		infra:  infra,
		relay:  relay,
		consumers: []*streams.Consumer{
			streams.NewConsumer(db, infra.Redis, consumer.GamesSpec, consumer.GameHandler(gameSyncService)),
			streams.NewConsumer(db, infra.Redis, consumer.UsersSpec, consumer.UserHandler(userActivityService)),
		},
	}
}

// relays the outbox and consumes game and user events until ctx ends
func (a *App) Start(ctx context.Context) {
	go a.relay.Run(ctx)

	for _, c := range a.consumers {
		go c.Run(ctx)
	}
}

// serves http alongside the background work in Start until ctx ends
func (a *App) Run(ctx context.Context) error {
	defer a.infra.Close()

	a.Start(ctx)

	if metricsSrv := server.StartMetricsServer(a.cfg.Server); metricsSrv != nil {
		defer func() { _ = metricsSrv.Close() }()
	}

	err := server.Serve(ctx, server.NewHTTPServer(a.cfg.Server, a.Engine, writeTimeout))
	slog.Info("contests service stopped")
	return err
}
