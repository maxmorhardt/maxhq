package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type fakeLimiter struct {
	allowed bool
	err     error
	buckets []string
	limits  []int
}

func (f *fakeLimiter) Allow(_ context.Context, bucket string, limit int, _ time.Duration) (bool, error) {
	f.buckets = append(f.buckets, bucket)
	f.limits = append(f.limits, limit)
	return f.allowed, f.err
}

func limitedRouter(limiter *fakeLimiter, limit int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/contact", RateLimit(limiter, "contact", limit, time.Hour), func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestRateLimit_AllowsAndKeysByClientIP(t *testing.T) {
	limiter := &fakeLimiter{allowed: true}

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/contact", http.NoBody)
	req.RemoteAddr = "1.2.3.4:5555"
	limitedRouter(limiter, 5).ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, []string{"contact:1.2.3.4"}, limiter.buckets)
	assert.Equal(t, []int{5}, limiter.limits)
}

func TestRateLimit_RejectsOverLimit(t *testing.T) {
	w := httptest.NewRecorder()
	limitedRouter(&fakeLimiter{allowed: false}, 5).ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/contact", http.NoBody))

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
}

func TestRateLimit_FailsOpenOnStoreError(t *testing.T) {
	w := httptest.NewRecorder()
	limitedRouter(&fakeLimiter{err: assert.AnError}, 5).ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/contact", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRateLimit_NonPositiveLimitDefaultsToOne(t *testing.T) {
	limiter := &fakeLimiter{allowed: true}

	w := httptest.NewRecorder()
	limitedRouter(limiter, 0).ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/contact", http.NoBody))

	assert.Equal(t, []int{1}, limiter.limits)
}
