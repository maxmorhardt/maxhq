package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func healthRouter(h HealthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/health/live", h.Liveness)
	r.GET("/health/ready", h.Readiness)
	return r
}

func TestLiveness(t *testing.T) {
	w := httptest.NewRecorder()
	healthRouter(NewHealthHandler(nil)).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/live", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"status":"UP"}`, w.Body.String())
}

func TestReadiness_AllUp(t *testing.T) {
	h := NewHealthHandler(map[string]Check{
		"database": func(context.Context) error { return nil },
		"redis":    func(context.Context) error { return nil },
	})

	w := httptest.NewRecorder()
	healthRouter(h).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/ready", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
	var resp api.ReadinessResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "UP", resp.Status)
	assert.Equal(t, map[string]string{"database": "UP", "redis": "UP"}, resp.Checks)
}

func TestReadiness_AnyDownFails(t *testing.T) {
	h := NewHealthHandler(map[string]Check{
		"database": func(context.Context) error { return nil },
		"redis":    func(context.Context) error { return errors.New("down") },
	})

	w := httptest.NewRecorder()
	healthRouter(h).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health/ready", http.NoBody))

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	var resp api.ReadinessResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "DOWN", resp.Status)
	assert.Equal(t, "DOWN", resp.Checks["redis"])
	assert.Equal(t, "UP", resp.Checks["database"])
}

func TestDatabaseCheck(t *testing.T) {
	assert.Error(t, DatabaseCheck(nil)(context.Background()))

	sqlDB, mock, err := sqlmock.New(sqlmock.MonitorPingsOption(true))
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{DisableAutomaticPing: true})
	require.NoError(t, err)

	mock.ExpectPing()
	assert.NoError(t, DatabaseCheck(db)(context.Background()))

	mock.ExpectPing().WillReturnError(errors.New("db gone"))
	assert.Error(t, DatabaseCheck(db)(context.Background()))
}

func TestRedisCheck(t *testing.T) {
	assert.Error(t, RedisCheck(nil)(context.Background()))

	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	assert.NoError(t, RedisCheck(client)(context.Background()))
	mr.Close()
	assert.Error(t, RedisCheck(client)(context.Background()))
}
