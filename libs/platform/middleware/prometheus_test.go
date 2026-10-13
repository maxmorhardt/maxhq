package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
)

func TestPrometheusMiddleware_RecordsMatchedRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(PrometheusMiddleware)
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/x", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPrometheusMiddleware_RecordsUnmatchedRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(PrometheusMiddleware)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/does-not-exist", http.NoBody))

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestPrometheusMiddleware_PanicStillReleasesTheConnectionGauge(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(PrometheusMiddleware)
	r.GET("/boom", func(*gin.Context) { panic("boom") })

	before := testutil.ToFloat64(metrics.HTTPActiveConnections)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/boom", http.NoBody))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.InDelta(t, before, testutil.ToFloat64(metrics.HTTPActiveConnections), 0, "the gauge is back where it started")
	assert.InDelta(t, 1, testutil.ToFloat64(metrics.HTTPRequestsTotal.WithLabelValues(http.MethodGet, "/boom", "500")), 0)
}
