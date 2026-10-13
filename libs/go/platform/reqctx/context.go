package reqctx

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/go/platform/api"
)

func LoggerFromContext(ctx context.Context) *slog.Logger {
	if log, ok := ctx.Value(api.LoggerKey).(*slog.Logger); ok {
		return log
	}

	return slog.Default()
}

func ContextWithLogger(ctx context.Context, log *slog.Logger) context.Context {
	if log == nil {
		return ctx
	}
	return context.WithValue(ctx, api.LoggerKey, log)
}

func LoggerFromGinContext(c *gin.Context) *slog.Logger {
	if log, ok := c.Get(api.LoggerKey); ok {
		return log.(*slog.Logger)
	}

	return slog.Default()
}

func ClaimsFromContext(ctx context.Context) *api.Claims {
	if claims, ok := ctx.Value(api.ClaimsKey).(*api.Claims); ok {
		return claims
	}

	return nil
}

func SetGinContextValue(c *gin.Context, key api.CTXKey, value any) {
	c.Set(key, value)
	c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), key, value))
}
