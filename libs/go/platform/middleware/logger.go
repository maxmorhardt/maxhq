package middleware

import (
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

func LoggerMiddleware(c *gin.Context) {
	start := time.Now()
	requestID := c.GetHeader("X-Request-Id")
	if requestID == "" {
		requestID = uuid.New().String()
	}

	cfRay := c.GetHeader("Cf-Ray")
	cfCountry := c.GetHeader("Cf-Ipcountry")

	log := slog.Default().With(
		"request_id", requestID,
		"client_ip", c.ClientIP(),
		"cf_ray", cfRay,
		"cf_country", cfCountry,
	)

	api.SetContextValue(c, api.RequestIDKey, requestID)
	api.SetContextValue(c, api.LoggerKey, log)

	c.Next()

	if strings.HasPrefix(c.Request.URL.Path, "/health/") {
		return
	}

	route := c.FullPath()
	if route == "" {
		route = "unmatched"
	}
	logging.FromGin(c).Info("request",
		"method", c.Request.Method,
		"route", route,
		"status", c.Writer.Status(),
		"duration_ms", time.Since(start).Milliseconds(),
	)
}
