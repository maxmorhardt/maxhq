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
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/maxmorhardt/maxstash/libs/go/platform/server"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func testInfra(t *testing.T) *server.Infra {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	mock.MatchExpectationsInOrder(false)
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{
		DisableAutomaticPing: true,
		Logger:               logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	mr := miniredis.RunT(t)
	return &server.Infra{DB: db, Redis: redis.NewClient(&redis.Options{Addr: mr.Addr()})}
}

func TestNew_WiresUpcomingBehindAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(&model.GamesConfig{}, testInfra(t))

	assert.Nil(t, app.runner, "a disabled worker is never started")

	w := httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/games/upcoming", http.NoBody))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestNew_BuildsWorkerWhenEnabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(&model.GamesConfig{Worker: model.WorkerConfig{Enabled: true, ActiveInterval: time.Minute, IdleInterval: time.Hour}}, testInfra(t))

	assert.NotNil(t, app.runner)
}

func TestRun_StopsWithContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(&model.GamesConfig{}, testInfra(t))

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- app.Run(ctx) }()

	time.Sleep(100 * time.Millisecond)
	cancel()
	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(15 * time.Second):
		t.Fatal("games service did not stop")
	}
}

func TestConnect_FailsWithoutDatabase(t *testing.T) {
	cfg := &model.GamesConfig{DB: config.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}}

	_, err := Connect(cfg)

	assert.Error(t, err)
}
