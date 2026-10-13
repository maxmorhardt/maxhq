package integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/platform/testkit"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

const (
	internalToken = "integration-internal-token"
	eventually    = 15 * time.Second

	ownerUser  = "owner@squares.test"
	memberUser = "member@squares.test"
)

var (
	contestsURL string
	rawDB       *sql.DB
	rdb         *redis.Client
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

	// start from the monolith's tables, the way production does, so the service has to adopt them
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

	cfg := &model.ContestsConfig{
		Server:   config.ServerConfig{AllowedOrigins: []string{"http://localhost:3000"}},
		DB:       pg.Config,
		Redis:    rd.Config,
		Streams:  config.StreamsConfig{Retention: time.Hour},
		Internal: config.InternalConfig{Token: internalToken},
	}
	infra, err := bootstrap.Connect(cfg)
	if err != nil {
		slog.Error("connect", "error", err)
		return 1
	}
	defer infra.Close()
	rdb = infra.Redis

	app := bootstrap.New(cfg, infra)
	app.Start(ctx)
	srv := httptest.NewServer(app.Engine)
	defer srv.Close()
	contestsURL = srv.URL

	return m.Run()
}

func call(t *testing.T, id testkit.Identity, method, path string, body any, headers ...string) testkit.Response {
	t.Helper()
	return testkit.Call(t, contestsURL, id, method, path, body, headers...)
}

func createContest(t *testing.T, owner, name string, maxSquares int, headers ...string) (*model.Contest, testkit.Response) {
	t.Helper()
	resp := call(t, testkit.As(owner), http.MethodPut, "/contests", model.CreateContestRequest{
		Owner: owner, Name: name, HomeTeam: "Chiefs", AwayTeam: "Eagles", MaxSquares: maxSquares,
	}, headers...)
	var contest model.Contest
	if resp.Status == http.StatusOK {
		resp.Decode(t, &contest)
	}
	return &contest, resp
}

// the internal snapshot is how realtime reads a whole contest
func snapshot(t *testing.T, user string, contestID uuid.UUID) *model.ContestSnapshot {
	t.Helper()
	resp := call(t, testkit.Anonymous, http.MethodGet,
		fmt.Sprintf("/internal/contests/%s/snapshot?user=%s", contestID, user), nil,
		"X-Internal-Token", internalToken)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var snap model.ContestSnapshot
	resp.Decode(t, &snap)
	return &snap
}

func claim(t *testing.T, user string, contestID, squareID uuid.UUID) {
	t.Helper()
	resp := call(t, testkit.As(user), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
}

// appends an event the way another service's relay would
func publish(t *testing.T, stream, eventType string, payload any) {
	t.Helper()
	data, err := json.Marshal(payload)
	require.NoError(t, err)
	require.NoError(t, rdb.XAdd(context.Background(), &redis.XAddArgs{
		Stream: streams.Key(stream),
		Values: []string{"type", eventType, "data", string(data), "event_id", uuid.NewString()},
	}).Err())
}
