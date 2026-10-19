package logging

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/stretchr/testify/assert"
)

func TestFromContext(t *testing.T) {
	logger := slog.New(slog.DiscardHandler)

	assert.Equal(t, logger, FromContext(NewContext(context.Background(), logger)))
	assert.Equal(t, slog.Default(), FromContext(context.Background()))
	assert.Equal(t, slog.Default(), FromContext(context.WithValue(context.Background(), api.LoggerKey, "not a logger")))
}

func TestNewContext_NilLoggerKeepsContext(t *testing.T) {
	ctx := context.Background()
	assert.Equal(t, ctx, NewContext(ctx, nil))
}

func TestFromGin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/", http.NoBody)

	assert.Equal(t, slog.Default(), FromGin(c))

	logger := slog.New(slog.DiscardHandler)
	c.Set(api.LoggerKey, logger)
	assert.Equal(t, logger, FromGin(c))
}
