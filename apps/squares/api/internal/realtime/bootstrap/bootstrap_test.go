package bootstrap

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging/natstest"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testInfra(t *testing.T) *server.Infra {
	t.Helper()
	nc := natstest.Run(t)
	js, err := messaging.InitJetStream(context.Background(), nc, model.NATSConfig{StreamMaxAge: time.Hour})
	require.NoError(t, err)
	mr := miniredis.RunT(t)
	return &server.Infra{NATS: nc, JS: js, Redis: redis.NewClient(&redis.Options{Addr: mr.Addr()})}
}

func testConfig() *model.RealtimeConfig {
	return &model.RealtimeConfig{
		Internal: model.InternalConfig{Token: "internal", ContestsURL: "http://127.0.0.1:1"},
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
	assert.Equal(t, http.StatusOK, w.Code, "realtime is ready with only nats and redis")
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

func TestConnect_FailsWithoutNATS(t *testing.T) {
	_, err := Connect(context.Background(), &model.RealtimeConfig{NATS: model.NATSConfig{URL: "nats://127.0.0.1:1"}})

	assert.Error(t, err)
}
