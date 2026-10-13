package logging

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
)

func FromContext(ctx context.Context) *slog.Logger {
	if log, ok := ctx.Value(api.LoggerKey).(*slog.Logger); ok {
		return log
	}
	return slog.Default()
}

func NewContext(ctx context.Context, log *slog.Logger) context.Context {
	if log == nil {
		return ctx
	}
	return context.WithValue(ctx, api.LoggerKey, log)
}

func FromGin(c *gin.Context) *slog.Logger {
	if log, ok := c.Get(api.LoggerKey); ok {
		return log.(*slog.Logger)
	}
	return slog.Default()
}
