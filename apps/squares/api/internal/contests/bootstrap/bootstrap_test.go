package bootstrap

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging/natstest"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func testInfra(t *testing.T) *server.Infra {
	t.Helper()

	sqlDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	mock.MatchExpectationsInOrder(false)
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{
		DisableAutomaticPing: true,
		Logger:               logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	nc := natstest.Run(t)
	js, err := messaging.InitJetStream(context.Background(), nc, model.NATSConfig{StreamMaxAge: time.Hour})
	require.NoError(t, err)

	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	return &server.Infra{DB: db, NATS: nc, JS: js, Redis: rdb}
}

func testConfig() *model.ContestsConfig {
	return &model.ContestsConfig{
		Server:   model.ServerConfig{Port: 0, AllowedOrigins: []string{"http://localhost:3000"}},
		Internal: model.InternalConfig{Token: "internal"},
	}
}

func TestNew_WiresRoutesAndGuards(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(testConfig(), testInfra(t))

	routes := map[string]bool{}
	for _, r := range app.Engine.Routes() {
		routes[r.Method+" "+r.Path] = true
	}
	for _, want := range []string{
		"GET /health/live",
		"GET /health/ready",
		"PUT /contests",
		"PATCH /contests/:id",
		"POST /contests/:id/squares/:squareId/claim",
		"POST /invites/:token/redeem",
		"GET /leaderboard",
		"GET /users/me/stats",
		"GET /internal/contests/:id/snapshot",
		"GET /internal/users/:email/activity",
	} {
		assert.True(t, routes[want], want)
	}

	// writes need the gateway's identity, and internal routes need the service token
	w := httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodPut, "/contests", http.NoBody))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	w = httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/internal/users/a@b.com/activity", http.NoBody))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	w = httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/live", http.NoBody))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRun_StartsConsumersAndStopsWithContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(testConfig(), testInfra(t))

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- app.Run(ctx) }()

	// the durable consumers exist once Run has started them
	require.Eventually(t, func() bool {
		_, err := app.infra.JS.Consumer(context.Background(), "SQUARES", "contests-games")
		return err == nil
	}, 5*time.Second, 50*time.Millisecond)

	cancel()
	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(15 * time.Second):
		t.Fatal("contests service did not stop")
	}
}

func TestConnect_FailsWithoutDatabase(t *testing.T) {
	cfg := testConfig()
	cfg.DB = model.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}

	_, err := Connect(context.Background(), cfg)

	assert.Error(t, err)
}
