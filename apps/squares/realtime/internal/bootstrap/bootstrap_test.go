package bootstrap

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/maxmorhardt/maxhq/libs/go/platform/server"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

func testInfra(t *testing.T) *server.Infra {
	t.Helper()
	mr := miniredis.RunT(t)
	return &server.Infra{Redis: redis.NewClient(&redis.Options{Addr: mr.Addr()})}
}

func testConfig() *model.RealtimeConfig {
	return &model.RealtimeConfig{
		Server:   config.ServerConfig{Host: "127.0.0.1"},
		Internal: config.InternalConfig{Token: "internal"},
		Contests: model.ContestsConfig{URL: "http://127.0.0.1:1"},
		Stream:   model.StreamConfig{HeartbeatInterval: time.Second, RevocationInterval: time.Minute},
	}
}

func TestNew_StreamRequiresGatewayIdentity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	app := New(testConfig(), testInfra(t), make(chan struct{}))

	w := httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/events/contests/x", http.NoBody))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	w = httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/ready", http.NoBody))
	assert.Equal(t, http.StatusOK, w.Code, "realtime is ready with only redis")
}

func TestRun_StopsWithContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, cancel := context.WithCancel(context.Background())
	app := New(testConfig(), testInfra(t), ctx.Done())

	done := make(chan error, 1)
	go func() { done <- app.Run(ctx) }()
	time.Sleep(100 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(15 * time.Second):
		t.Fatal("realtime service did not stop")
	}
}

func TestConnect_FailsWithoutRedis(t *testing.T) {
	_, err := Connect(&model.RealtimeConfig{Redis: config.RedisConfig{URL: "redis://127.0.0.1:1/0"}})

	assert.Error(t, err)
}
