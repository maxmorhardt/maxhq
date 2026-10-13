package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
)

func PrometheusMiddleware(c *gin.Context) {
	method := c.Request.Method
	start := time.Now()

	metrics.HTTPActiveConnections.Inc()

	// deferred so a handler panic, which gin.Recovery only catches further up the chain, is still counted
	// (as the 500 Recovery will answer with) and never leaves the connection gauge raised
	defer func() {
		status := c.Writer.Status()
		recovered := recover()
		if recovered != nil {
			status = http.StatusInternalServerError
		}

		path := c.FullPath()
		if path == "" {
			path = "unmatched"
		}
		code := strconv.Itoa(status)
		metrics.HTTPRequestsTotal.WithLabelValues(method, path, code).Inc()
		metrics.HTTPRequestDuration.WithLabelValues(method, path, code).Observe(time.Since(start).Seconds())
		metrics.HTTPActiveConnections.Dec()

		if recovered != nil {
			panic(recovered)
		}
	}()

	c.Next()
}
