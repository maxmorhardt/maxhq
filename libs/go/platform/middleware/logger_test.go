package middleware

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoggerMiddleware_GeneratesRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	var gotRequestID string
	var gotLogger any
	r.GET("/x", LoggerMiddleware, func(c *gin.Context) {
		gotRequestID = c.GetString(api.RequestIDKey)
		gotLogger, _ = c.Get(api.LoggerKey)
		c.Status(http.StatusOK)
	})

	r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/x", http.NoBody))

	assert.NotEmpty(t, gotRequestID, "request id should be generated when header absent")
	_, ok := gotLogger.(*slog.Logger)
	assert.True(t, ok, "logger should be stored in context")
}

func TestLoggerMiddleware_UsesProvidedRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	var gotRequestID string
	r.GET("/x", LoggerMiddleware, func(c *gin.Context) {
		gotRequestID = c.GetString(api.RequestIDKey)
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/x", http.NoBody)
	req.Header.Set("X-Request-Id", "fixed-id")
	r.ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, "fixed-id", gotRequestID)
}

func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(prev) })
	return &buf
}

func TestLoggerMiddleware_LogsRequestWithUser(t *testing.T) {
	buf := captureLogs(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(LoggerMiddleware)
	r.GET("/contests/:id", func(c *gin.Context) {
		api.SetContextValue(c, api.LoggerKey, logging.FromGin(c).With("user", "a@example.com"))
		c.Status(http.StatusCreated)
	})

	req := httptest.NewRequest(http.MethodGet, "/contests/42", http.NoBody)
	req.Header.Set("Cf-Ipcountry", "US")
	req.Header.Set(HeaderRequestID, "req-1")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	assert.Equal(t, "req-1", rec.Header().Get(HeaderRequestID))

	var entry map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &entry))
	assert.Equal(t, "request", entry["msg"])
	assert.Equal(t, "GET", entry["method"])
	assert.Equal(t, "/contests/:id", entry["route"])
	assert.InDelta(t, http.StatusCreated, entry["status"], 0)
	assert.Equal(t, "a@example.com", entry["user"])
	assert.Equal(t, "US", entry["cf_country"])
	assert.Contains(t, entry, "duration_ms")
}

func TestLoggerMiddleware_LogsUnmatchedRoute(t *testing.T) {
	buf := captureLogs(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(LoggerMiddleware)

	r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/nope", http.NoBody))

	var entry map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &entry))
	assert.Equal(t, "unmatched", entry["route"])
	assert.InDelta(t, http.StatusNotFound, entry["status"], 0)
}

func TestLoggerMiddleware_SkipsHealthProbes(t *testing.T) {
	buf := captureLogs(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(LoggerMiddleware)
	r.GET("/health/live", func(c *gin.Context) { c.Status(http.StatusOK) })

	r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/health/live", http.NoBody))

	assert.Empty(t, buf.String())
}

func TestLoggerMiddleware_HandlerLogsCarryMethodAndRoute(t *testing.T) {
	buf := captureLogs(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(LoggerMiddleware)
	r.POST("/contests/:id/squares", func(c *gin.Context) {
		logging.FromGin(c).Error("failed to claim square")
		c.Status(http.StatusInternalServerError)
	})

	r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/contests/42/squares", http.NoBody))

	var entry map[string]any
	require.NoError(t, json.NewDecoder(buf).Decode(&entry))
	assert.Equal(t, "failed to claim square", entry["msg"])
	assert.Equal(t, "POST", entry["method"])
	assert.Equal(t, "/contests/:id/squares", entry["route"])
}

func TestLoggerMiddleware_LogsPanicsAsServerErrors(t *testing.T) {
	buf := captureLogs(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery(), LoggerMiddleware)
	r.GET("/boom", func(*gin.Context) { panic("boom") })

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/boom", http.NoBody))

	var entry map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &entry))
	assert.Equal(t, "request", entry["msg"])
	assert.InDelta(t, http.StatusInternalServerError, entry["status"], 0)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
}
