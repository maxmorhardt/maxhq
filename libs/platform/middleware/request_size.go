package middleware

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
)

const (
	maxRequestSize = 1 << 20
	errorMessage   = "Request body too large. Maximum size is 1MB"
)

func RequestSizeLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxRequestSize {
			rejectTooLarge(c, c.Request.ContentLength)
			return
		}

		if c.Request.Body == nil || c.Request.Body == http.NoBody {
			c.Next()
			return
		}

		body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxRequestSize+1))
		_ = c.Request.Body.Close()
		if err != nil {
			logging.FromGin(c).Warn("failed to read request body", "error", err)
			c.AbortWithStatusJSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Could not read request body", c))
			return
		}
		if len(body) > maxRequestSize {
			rejectTooLarge(c, -1)
			return
		}

		c.Request.Body = io.NopCloser(bytes.NewReader(body))
		c.Next()
	}
}

func rejectTooLarge(c *gin.Context, declared int64) {
	logging.FromGin(c).Warn("request body too large", "content_length", declared)
	metrics.IncRequestSizeRejected()
	c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, api.NewAPIError(
		http.StatusRequestEntityTooLarge,
		errorMessage,
		c,
	))
}
