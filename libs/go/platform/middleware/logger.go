package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/libs/go/platform/api"
	"github.com/maxmorhardt/maxstash/libs/go/platform/reqctx"
)

func LoggerMiddleware(c *gin.Context) {
	// extract or generate request id
	requestID := c.GetHeader("X-Request-Id")
	if requestID == "" {
		requestID = uuid.New().String()
	}

	cfRay := c.GetHeader("Cf-Ray")
	cfCountry := c.GetHeader("Cf-Ipcountry")

	// create logger with request metadata
	log := slog.Default().With(
		"request_id", requestID,
		"client_ip", c.ClientIP(),
		"cf_ray", cfRay,
		"cf_country", cfCountry,
	)

	// store request id and logger in context
	reqctx.SetGinContextValue(c, api.RequestIDKey, requestID)
	reqctx.SetGinContextValue(c, api.LoggerKey, log)

	c.Next()
}
