package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
)

const (
	HeaderIdempotencyKey     = "Idempotency-Key"
	HeaderIdempotentReplayed = "Idempotent-Replayed"

	idempotencyTTL       = 24 * time.Hour
	maxIdempotencyKeyLen = 255
)

type capturingWriter struct {
	gin.ResponseWriter
	body bytes.Buffer
}

func (w *capturingWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *capturingWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

// replays the first response for a repeated Idempotency-Key, so a retried create cannot create twice
func Idempotency(store cache.IdempotencyStore, service string) gin.HandlerFunc {
	return func(c *gin.Context) {
		idemKey := c.GetHeader(HeaderIdempotencyKey)
		if idemKey == "" || !isMutating(c.Request.Method) {
			c.Next()
			return
		}

		log := reqctx.LoggerFromGinContext(c)
		if len(idemKey) > maxIdempotencyKeyLen {
			c.AbortWithStatusJSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Idempotency-Key must be at most 255 characters", c))
			return
		}

		fingerprint, err := requestFingerprint(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Invalid request body", c))
			return
		}

		// keys are scoped per caller so one user's key can never replay another user's response
		scope := c.GetString(api.UserKey)
		if scope == "" {
			scope = c.ClientIP()
		}
		storeKey := service + ":" + scope + ":" + idemKey

		existing, reserved, err := store.Reserve(c.Request.Context(), storeKey, fingerprint, idempotencyTTL)
		if err != nil {
			metrics.IncRedisError("idempotency_reserve")
			metrics.IncIdempotentRequest("unavailable")
			log.Warn("idempotency store unavailable, processing without replay protection", "error", err)
			c.Next()
			return
		}

		if !reserved {
			respondFromRecord(c, existing, fingerprint)
			return
		}

		writer := &capturingWriter{ResponseWriter: c.Writer}
		c.Writer = writer
		c.Next()

		status := writer.Status()
		// a server failure is not a result worth replaying, so free the key for the client's retry
		if status >= http.StatusInternalServerError {
			metrics.IncIdempotentRequest("released")
			if err := store.Release(c.Request.Context(), storeKey); err != nil {
				metrics.IncRedisError("idempotency_release")
				log.Warn("failed to release idempotency key", "error", err)
			}
			return
		}

		metrics.IncIdempotentRequest("stored")
		record := &cache.IdempotencyRecord{
			Fingerprint: fingerprint,
			Status:      status,
			ContentType: writer.Header().Get("Content-Type"),
			ETag:        writer.Header().Get("ETag"),
			Body:        writer.body.Bytes(),
		}
		if err := store.Complete(c.Request.Context(), storeKey, record, idempotencyTTL); err != nil {
			metrics.IncRedisError("idempotency_complete")
			log.Warn("failed to store idempotent response", "error", err)
		}
	}
}

func respondFromRecord(c *gin.Context, record *cache.IdempotencyRecord, fingerprint string) {
	switch {
	case record.Fingerprint != fingerprint:
		metrics.IncIdempotentRequest("mismatch")
		c.AbortWithStatusJSON(http.StatusUnprocessableEntity, api.NewAPIError(http.StatusUnprocessableEntity, "Idempotency-Key was already used for a different request", c))
	case record.State != cache.IdempotencyCompleted:
		metrics.IncIdempotentRequest("in_progress")
		c.Header("Retry-After", "1")
		c.AbortWithStatusJSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, "A request with this Idempotency-Key is still being processed", c))
	default:
		metrics.IncIdempotentRequest("replayed")
		c.Header(HeaderIdempotentReplayed, "true")
		if record.ETag != "" {
			c.Header("ETag", record.ETag)
		}
		if len(record.Body) == 0 {
			c.AbortWithStatus(record.Status)
			return
		}
		c.Data(record.Status, record.ContentType, record.Body)
		c.Abort()
	}
}

// same method, path, and body means the same request; anything else under the same key is a client bug
func requestFingerprint(c *gin.Context) (string, error) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return "", err
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(body))

	h := sha256.New()
	h.Write([]byte(c.Request.Method))
	h.Write([]byte{0})
	h.Write([]byte(c.Request.URL.Path))
	h.Write([]byte{0})
	h.Write(body)
	return hex.EncodeToString(h.Sum(nil)), nil
}

func isMutating(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}
