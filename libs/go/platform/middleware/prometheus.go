package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/libs/go/platform/metrics"
)

func PrometheusMiddleware(c *gin.Context) {
	method := c.Request.Method
	start := time.Now()

	metrics.HTTPActiveConnections.Inc()

	// deferred so a handler panic is still counted, as the 500 gin.Recovery answers with
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
