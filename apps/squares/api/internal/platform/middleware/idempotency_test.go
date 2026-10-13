package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func idempotentRouter(t *testing.T, store cache.IdempotencyStore, status int) (r *gin.Engine, calls *int) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	count := 0
	r = gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(model.UserKey, "user@example.com")
		c.Next()
	})
	r.Use(Idempotency(store, "contests"))
	handler := func(c *gin.Context) {
		count++
		c.Header("ETag", `"3"`)
		c.JSON(status, gin.H{"call": count})
	}
	r.POST("/contests", handler)
	r.GET("/contests", handler)
	return r, &count
}

func redisStore(t *testing.T) (cache.IdempotencyStore, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return cache.NewIdempotencyStore(client), mr
}

func post(r *gin.Engine, key, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/contests", strings.NewReader(body))
	if key != "" {
		req.Header.Set(HeaderIdempotencyKey, key)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestIdempotency_ReplaysTheFirstResponse(t *testing.T) {
	store, _ := redisStore(t)
	r, calls := idempotentRouter(t, store, http.StatusCreated)

	first := post(r, "k1", `{"name":"a"}`)
	second := post(r, "k1", `{"name":"a"}`)

	assert.Equal(t, 1, *calls)
	assert.Equal(t, http.StatusCreated, second.Code)
	assert.JSONEq(t, first.Body.String(), second.Body.String())
	assert.Equal(t, "true", second.Header().Get(HeaderIdempotentReplayed))
	assert.Equal(t, `"3"`, second.Header().Get("ETag"))
	assert.Empty(t, first.Header().Get(HeaderIdempotentReplayed))
}

func TestIdempotency_RejectsKeyReuseWithDifferentBody(t *testing.T) {
	store, _ := redisStore(t)
	r, calls := idempotentRouter(t, store, http.StatusOK)

	post(r, "k1", `{"name":"a"}`)
	w := post(r, "k1", `{"name":"b"}`)

	assert.Equal(t, 1, *calls)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestIdempotency_ReportsInFlightDuplicates(t *testing.T) {
	store, _ := redisStore(t)
	_, reserved, err := store.Reserve(context.Background(), "contests:user@example.com:k1", fingerprintOf(t, `{}`), time.Hour)
	require.NoError(t, err)
	require.True(t, reserved)

	r, calls := idempotentRouter(t, store, http.StatusOK)
	w := post(r, "k1", `{}`)

	assert.Equal(t, 0, *calls)
	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Equal(t, "1", w.Header().Get("Retry-After"))
}

func TestIdempotency_ReleasesKeyAfterServerError(t *testing.T) {
	store, _ := redisStore(t)
	r, calls := idempotentRouter(t, store, http.StatusInternalServerError)

	post(r, "k1", `{}`)
	post(r, "k1", `{}`)

	assert.Equal(t, 2, *calls, "a failed attempt must not be replayed")
}

func TestIdempotency_PassesThroughWithoutKeyOrForReads(t *testing.T) {
	store, _ := redisStore(t)
	r, calls := idempotentRouter(t, store, http.StatusOK)

	post(r, "", `{}`)
	post(r, "", `{}`)

	req := httptest.NewRequest(http.MethodGet, "/contests", http.NoBody)
	req.Header.Set(HeaderIdempotencyKey, "k1")
	r.ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, 3, *calls)
}

func TestIdempotency_RejectsOversizedKeys(t *testing.T) {
	store, _ := redisStore(t)
	r, calls := idempotentRouter(t, store, http.StatusOK)

	w := post(r, strings.Repeat("k", maxIdempotencyKeyLen+1), `{}`)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Equal(t, 0, *calls)
}

func TestIdempotency_FailsOpenWhenRedisIsDown(t *testing.T) {
	store, mr := redisStore(t)
	mr.Close()
	r, calls := idempotentRouter(t, store, http.StatusOK)

	post(r, "k1", `{}`)
	post(r, "k1", `{}`)

	assert.Equal(t, 2, *calls)
}

type erroringStore struct {
	cache.IdempotencyStore
}

func (erroringStore) Reserve(context.Context, string, string, time.Duration) (*cache.IdempotencyRecord, bool, error) {
	return nil, true, nil
}

func (erroringStore) Complete(context.Context, string, *cache.IdempotencyRecord, time.Duration) error {
	return errors.New("write failed")
}

func (erroringStore) Release(context.Context, string) error {
	return errors.New("delete failed")
}

func TestIdempotency_ToleratesStoreWriteFailures(t *testing.T) {
	okRouter, okCalls := idempotentRouter(t, erroringStore{}, http.StatusOK)
	assert.Equal(t, http.StatusOK, post(okRouter, "k1", `{}`).Code)
	assert.Equal(t, 1, *okCalls)

	failRouter, failCalls := idempotentRouter(t, erroringStore{}, http.StatusBadGateway)
	assert.Equal(t, http.StatusBadGateway, post(failRouter, "k1", `{}`).Code)
	assert.Equal(t, 1, *failCalls)
}

func TestRespondFromRecord_ReplaysEmptyBodies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodDelete, "/x", http.NoBody)

	respondFromRecord(c, &cache.IdempotencyRecord{State: cache.IdempotencyCompleted, Fingerprint: "fp", Status: http.StatusNoContent}, "fp")

	assert.Equal(t, http.StatusNoContent, c.Writer.Status())
	assert.True(t, c.IsAborted())
}

func fingerprintOf(t *testing.T, body string) string {
	t.Helper()
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/contests", strings.NewReader(body))
	fp, err := requestFingerprint(c)
	require.NoError(t, err)
	return fp
}
