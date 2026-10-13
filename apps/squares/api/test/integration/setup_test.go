package integration

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/stdlib"
	accounts "github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/bootstrap"
	contests "github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/bootstrap"
	games "github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	realtime "github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/bootstrap"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	postgresTag      = "postgres:17-alpine"
	postgresDBName   = "squares"
	postgresUser     = "test_user"
	postgresPassword = "test_password"
	natsTag          = "nats:2.11-alpine"
	redisTag         = "redis:7-alpine"

	internalToken = "integration-internal-token"

	// fixed identities used across all integration tests
	ownerUser  = "owner@squares.test"
	memberUser = "member@squares.test"
	legacyUser = "legacy@squares.test"
)

// one running copy of each service, reached the way the gateway reaches them
var (
	contestsURL string
	gamesURL    string
	accountsURL string
	realtimeURL string

	stream  jetstream.JetStream
	rawDB   *sql.DB
	cleanup []func()
)

func TestMain(m *testing.M) {
	ctx, cancel := context.WithCancel(context.Background())
	gin.SetMode(gin.TestMode)

	code := func() int {
		defer func() {
			cancel()
			for i := len(cleanup) - 1; i >= 0; i-- {
				cleanup[i]()
			}
		}()

		dbCfg := startPostgres(ctx)
		natsCfg := startNATS(ctx)
		redisCfg := startRedis(ctx)

		// the pre-split monolith's tables, so every service has to adopt existing data on first boot
		seedLegacySchema()

		bootServices(ctx, &dbCfg, natsCfg, redisCfg)
		return m.Run()
	}()

	os.Exit(code)
}

func fail(msg string, err error) {
	slog.Error(msg, "error", err)
	panic(err)
}

func startPostgres(ctx context.Context) model.DatabaseConfig {
	container, err := postgres.Run(ctx,
		postgresTag,
		postgres.WithDatabase(postgresDBName),
		postgres.WithUsername(postgresUser),
		postgres.WithPassword(postgresPassword),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second)),
	)
	if err != nil {
		fail("failed to start postgres", err)
	}
	cleanup = append(cleanup, func() { _ = container.Terminate(context.Background()) })

	host, err := container.Host(ctx)
	if err != nil {
		fail("failed to get postgres host", err)
	}
	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		fail("failed to get postgres port", err)
	}

	portNum, err := strconv.Atoi(port.Port())
	if err != nil {
		fail("failed to parse postgres port", err)
	}

	cfg := model.DatabaseConfig{Host: host, Port: portNum, User: postgresUser, Password: postgresPassword, Name: postgresDBName, SSLMode: "disable"}
	rawDB, err = sql.Open("pgx", fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, portNum, postgresUser, postgresPassword, postgresDBName))
	if err != nil {
		fail("failed to open raw db", err)
	}
	cleanup = append(cleanup, func() { _ = rawDB.Close() })

	return cfg
}

func startNATS(ctx context.Context) model.NATSConfig {
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        natsTag,
			Cmd:          []string{"-js"},
			ExposedPorts: []string{"4222/tcp"},
			WaitingFor:   wait.ForLog("Server is ready").WithStartupTimeout(30 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		fail("failed to start nats", err)
	}
	cleanup = append(cleanup, func() { _ = container.Terminate(context.Background()) })

	endpoint, err := container.PortEndpoint(ctx, "4222/tcp", "nats")
	if err != nil {
		fail("failed to get nats endpoint", err)
	}

	return model.NATSConfig{URL: endpoint, StreamReplicas: 1, StreamMaxAge: time.Hour}
}

func startRedis(ctx context.Context) model.RedisConfig {
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        redisTag,
			ExposedPorts: []string{"6379/tcp"},
			WaitingFor:   wait.ForLog("Ready to accept connections").WithStartupTimeout(30 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		fail("failed to start redis", err)
	}
	cleanup = append(cleanup, func() { _ = container.Terminate(context.Background()) })

	endpoint, err := container.PortEndpoint(ctx, "6379/tcp", "redis")
	if err != nil {
		fail("failed to get redis endpoint", err)
	}

	return model.RedisConfig{URL: endpoint + "/0"}
}

// boots services in the order a cold cutover could hit: contests first, while users and games still sit in public
func bootServices(ctx context.Context, dbCfg *model.DatabaseConfig, natsCfg model.NATSConfig, redisCfg model.RedisConfig) {
	serverCfg := model.ServerConfig{AllowedOrigins: []string{"http://localhost:3000"}}

	contestsCfg := &model.ContestsConfig{Server: serverCfg, DB: *dbCfg, NATS: natsCfg, Redis: redisCfg, Internal: model.InternalConfig{Token: internalToken}}
	contestsInfra, err := contests.Connect(ctx, contestsCfg)
	if err != nil {
		fail("failed to connect contests", err)
	}
	stream = contestsInfra.JS
	contestsApp := contests.New(contestsCfg, contestsInfra)
	stopConsumers, err := contestsApp.Start(ctx)
	if err != nil {
		fail("failed to start contests", err)
	}
	contestsURL = serve(contestsApp.Engine, contestsInfra, stopConsumers)

	gamesCfg := &model.GamesConfig{Server: serverCfg, DB: *dbCfg, NATS: natsCfg, Redis: redisCfg}
	gamesInfra, err := games.Connect(ctx, gamesCfg)
	if err != nil {
		fail("failed to connect games", err)
	}
	gamesApp := games.New(gamesCfg, gamesInfra)
	gamesApp.Start(ctx)
	gamesURL = serve(gamesApp.Engine, gamesInfra, nil)

	internal := model.InternalConfig{Token: internalToken, ContestsURL: contestsURL}
	accountsCfg := &model.AccountsConfig{
		Server: serverCfg, DB: *dbCfg, NATS: natsCfg, Redis: redisCfg, Internal: internal,
		SMTP:      model.SMTPConfig{Host: "127.0.0.1", Port: 1, User: "noreply@squares.test", SupportEmail: "support@squares.test"},
		Turnstile: model.TurnstileConfig{SecretKey: "unused", BaseURL: "http://127.0.0.1:1"},
		Contact:   model.ContactConfig{RateLimit: 10},
	}
	accountsInfra, err := accounts.Connect(ctx, accountsCfg)
	if err != nil {
		fail("failed to connect accounts", err)
	}
	accountsApp := accounts.New(accountsCfg, accountsInfra)
	accountsApp.Start(ctx)
	accountsURL = serve(accountsApp.Engine, accountsInfra, nil)

	realtimeCfg := &model.RealtimeConfig{
		Server: serverCfg, NATS: natsCfg, Redis: redisCfg, Internal: internal,
		Stream: model.StreamConfig{HeartbeatInterval: 25 * time.Second, RevocationInterval: time.Minute},
	}
	realtimeInfra, err := realtime.Connect(ctx, realtimeCfg)
	if err != nil {
		fail("failed to connect realtime", err)
	}
	realtimeURL = serve(realtime.New(realtimeCfg, realtimeInfra, ctx.Done()).Engine, realtimeInfra, nil)
}

func serve(engine http.Handler, infra *server.Infra, stop func()) string {
	srv := httptest.NewServer(engine)
	cleanup = append(cleanup, func() {
		srv.CloseClientConnections()
		srv.Close()
		if stop != nil {
			stop()
		}
		infra.Close()
	})
	return srv.URL
}

// --- gateway stand-in ---

type identity struct {
	email    string
	issuedAt time.Time
}

func as(email string) identity {
	return identity{email: email, issuedAt: time.Now().Add(-time.Minute)}
}

var anonymous = identity{}

// the claim headers envoy gateway sets after validating the dex token
func (id identity) apply(req *http.Request) {
	if id.email == "" {
		return
	}
	req.Header.Set(middleware.HeaderAuthEmail, id.email)
	req.Header.Set(middleware.HeaderAuthName, "Test "+id.email)
	req.Header.Set(middleware.HeaderAuthEmailVerified, "true")
	req.Header.Set(middleware.HeaderAuthIssuedAt, strconv.FormatInt(id.issuedAt.Unix(), 10))
	req.Header.Set(middleware.HeaderAuthExpiresAt, strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
}

type response struct {
	status int
	header http.Header
	body   []byte
}

func (r response) decode(t *testing.T, v any) {
	t.Helper()
	if err := json.Unmarshal(r.body, v); err != nil {
		t.Fatalf("failed to decode %d response %q: %v", r.status, string(r.body), err)
	}
}

func call(t *testing.T, base string, id identity, method, path string, body any, headers ...string) response {
	t.Helper()

	var reader io.Reader = http.NoBody
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(context.Background(), method, base+path, reader)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	id.apply(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}

	return response{status: resp.StatusCode, header: resp.Header, body: raw}
}
