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
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/maxmorhardt/maxstash/libs/platform/server"
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

	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	return &server.Infra{DB: db, Redis: rdb}
}

func testConfig() *model.ContestsConfig {
	return &model.ContestsConfig{
		Server:   config.ServerConfig{Port: 0, AllowedOrigins: []string{"http://localhost:3000"}},
		Internal: config.InternalConfig{Token: "internal"},
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
	assert.Len(t, app.consumers, 2, "games and users streams")

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- app.Run(ctx) }()

	time.Sleep(100 * time.Millisecond)
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
	cfg.DB = config.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}

	_, err := Connect(cfg)

	assert.Error(t, err)
}
