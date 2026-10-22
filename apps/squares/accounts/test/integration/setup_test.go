package integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/bootstrap"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/maxmorhardt/maxhq/libs/go/platform/middleware"
	"github.com/maxmorhardt/maxhq/libs/go/platform/server"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/contracts"
	"github.com/redis/go-redis/v9"
)

const (
	internalToken = "integration-internal-token"
	eventually    = 15 * time.Second
)

var (
	rawDB    *sql.DB
	rdb      *redis.Client
	contests = &fakeContests{active: map[string][]contracts.UserActiveContest{}}
	baseCfg  *model.AccountsConfig
	replicaA string
	replicaB string
	stopAll  []func()
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pg, err := testkit.StartPostgres(ctx)
	if err != nil {
		slog.Error("postgres", "error", err)
		return 1
	}
	defer pg.Terminate()
	rawDB = pg.DB

	legacy, err := os.ReadFile("testdata/legacy_schema.sql")
	if err != nil {
		slog.Error("legacy schema", "error", err)
		return 1
	}
	if _, err = rawDB.Exec(string(legacy)); err != nil {
		slog.Error("legacy schema", "error", err)
		return 1
	}

	rd, err := testkit.StartRedis(ctx)
	if err != nil {
		slog.Error("redis", "error", err)
		return 1
	}
	defer rd.Terminate()

	contestsSrv := httptest.NewServer(contests)
	defer contestsSrv.Close()

	baseCfg = &model.AccountsConfig{
		Server:    config.ServerConfig{AllowedOrigins: []string{"http://localhost:3000"}},
		DB:        pg.Config,
		Redis:     rd.Config,
		Streams:   config.StreamsConfig{Retention: time.Hour},
		Internal:  config.InternalConfig{Token: internalToken},
		Contests:  model.ContestsConfig{URL: contestsSrv.URL},
		SMTP:      model.SMTPConfig{Host: "127.0.0.1", Port: 1, User: "noreply@squares.test", SupportEmail: "support@squares.test"},
		Turnstile: model.TurnstileConfig{SecretKey: "unused", BaseURL: "http://127.0.0.1:1"},
	}
	defer func() {
		for _, stop := range stopAll {
			stop()
		}
	}()

	var infra *server.Infra
	if replicaA, infra, err = startReplica(ctx); err != nil {
		slog.Error("replica a", "error", err)
		return 1
	}
	rdb = infra.Redis
	if replicaB, _, err = startReplica(ctx); err != nil {
		slog.Error("replica b", "error", err)
		return 1
	}

	return m.Run()
}

func startReplica(ctx context.Context) (string, *server.Infra, error) {
	infra, err := bootstrap.Connect(baseCfg)
	if err != nil {
		return "", nil, err
	}
	app := bootstrap.New(baseCfg, infra)
	app.Start(ctx)
	srv := httptest.NewServer(app.Engine)
	stopAll = append(stopAll, func() {
		srv.Close()
		infra.Close()
	})
	return srv.URL, infra, nil
}

type fakeContests struct {
	mu     sync.Mutex
	active map[string][]contracts.UserActiveContest
}

func (f *fakeContests) setActive(email string, contests ...contracts.UserActiveContest) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.active[email] = contests
}

func (f *fakeContests) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get(middleware.HeaderInternalToken) != internalToken {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	email := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/internal/users/"), "/activity")

	f.mu.Lock()
	active := f.active[email]
	f.mu.Unlock()
	if active == nil {
		active = []contracts.UserActiveContest{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(contracts.UserActivitySummary{ActiveContests: active})
}
