package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
)

func LoggerMiddleware(c *gin.Context) {
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
}
