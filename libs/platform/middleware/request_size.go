package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
)

const (
	maxRequestSize = 1 << 20
	errorMessage   = "Request body too large. Maximum size is 1MB"
)

func RequestSizeLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		log := reqctx.LoggerFromGinContext(c)

		// max bytes for the request body
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRequestSize)

		// read beyond limit triggers error
		err := c.Request.ParseForm()
		if err == nil {
			c.Next()
			return
		}

		log.Warn("request body too large", "error", err)
		metrics.IncRequestSizeRejected()
		c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, api.NewAPIError(
			http.StatusRequestEntityTooLarge,
			errorMessage,
			c,
		))
	}
}
