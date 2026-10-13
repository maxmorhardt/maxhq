package bootstrap

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
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

func testInfra(t *testing.T) (*server.Infra, sqlmock.Sqlmock) {
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

	nc := natstest.Run(t)
	js, err := messaging.InitJetStream(context.Background(), nc, model.NATSConfig{StreamMaxAge: time.Hour})
	require.NoError(t, err)

	mr := miniredis.RunT(t)
	return &server.Infra{DB: db, NATS: nc, JS: js, Redis: redis.NewClient(&redis.Options{Addr: mr.Addr()})}, mock
}

func testConfig() *model.AccountsConfig {
	return &model.AccountsConfig{
		Contact:  model.ContactConfig{RateLimit: 1},
		Internal: model.InternalConfig{Token: "internal", ContestsURL: "http://127.0.0.1:1"},
	}
}

func TestNew_WiresProfileAndContactRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	infra, _ := testInfra(t)
	app := New(testConfig(), infra)

	w := httptest.NewRecorder()
	app.Engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/users/me", http.NoBody))
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// the contact form is public but rate limited per client ip
	post := func() int {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/contact", strings.NewReader("{}"))
		req.Header.Set("Content-Type", "application/json")
		app.Engine.ServeHTTP(rec, req)
		return rec.Code
	}
	assert.Equal(t, http.StatusBadRequest, post())
	assert.Equal(t, http.StatusTooManyRequests, post())
}

func TestRun_SyncsRevocationsAndStopsWithContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	infra, mock := testInfra(t)
	mock.ExpectQuery(`SELECT email, deleted_at FROM "deleted_accounts"`).
		WillReturnRows(sqlmock.NewRows([]string{"email", "deleted_at"}).AddRow("gone@b.com", time.Now().Add(-time.Hour)))
	app := New(testConfig(), infra)

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- app.Run(ctx) }()

	require.Eventually(t, func() bool {
		n, err := infra.Redis.Exists(context.Background(), "squares:revoked:gone@b.com").Result()
		return err == nil && n == 1
	}, 5*time.Second, 50*time.Millisecond)

	cancel()
	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(15 * time.Second):
		t.Fatal("accounts service did not stop")
	}
}

func TestConnect_FailsWithoutDatabase(t *testing.T) {
	cfg := testConfig()
	cfg.DB = model.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}

	_, err := Connect(context.Background(), cfg)

	assert.Error(t, err)
}
