package middleware

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

const (
	HeaderRequestID    = "X-Request-Id"
	maxRequestIDLength = 128
)

func LoggerMiddleware(c *gin.Context) {
	start := time.Now()
	requestID := c.GetHeader(HeaderRequestID)
	if requestID == "" || len(requestID) > maxRequestIDLength {
		requestID = uuid.New().String()
	}

	route := c.FullPath()
	if route == "" {
		route = "unmatched"
	}

	log := slog.Default().With(
		"request_id", requestID,
		"method", c.Request.Method,
		"route", route,
		"client_ip", c.ClientIP(),
		"cf_ray", c.GetHeader("Cf-Ray"),
		"cf_country", c.GetHeader("Cf-Ipcountry"),
		// set by Cloudflare's visitor location headers managed transform
		"cf_region", c.GetHeader("Cf-Region"),
		"cf_city", c.GetHeader("Cf-Ipcity"),
	)

	api.SetContextValue(c, api.RequestIDKey, requestID)
	api.SetContextValue(c, api.LoggerKey, log)
	c.Header(HeaderRequestID, requestID)

	// deferred so a handler panic is still logged, as the 500 gin.Recovery answers with
	defer func() {
		status := c.Writer.Status()
		recovered := recover()
		if recovered != nil {
			status = http.StatusInternalServerError
		}

		if !strings.HasPrefix(c.Request.URL.Path, "/health/") {
			logging.FromGin(c).Info("request",
				"status", status,
				"duration_ms", time.Since(start).Milliseconds(),
			)
		}

		if recovered != nil {
			panic(recovered)
		}
	}()

	c.Next()
}
