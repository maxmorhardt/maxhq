package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/go/platform/api"
	"github.com/maxmorhardt/maxstash/libs/go/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/go/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/go/platform/reqctx"
)

// limits per client ip across every replica; a redis outage lets requests through rather than blocking them
func RateLimit(limiter cache.RateLimiter, name string, limit int, window time.Duration) gin.HandlerFunc {
	if limit <= 0 {
		limit = 1
	}

	return func(c *gin.Context) {
		allowed, err := limiter.Allow(c.Request.Context(), name+":"+c.ClientIP(), limit, window)
		if err != nil {
			metrics.IncRedisError("rate_limit")
			reqctx.LoggerFromGinContext(c).Warn("rate limit check failed, allowing request", "limiter", name, "error", err)
			c.Next()
			return
		}

		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, api.NewAPIError(http.StatusTooManyRequests, "Too many requests", c))
			return
		}

		c.Next()
	}
}
