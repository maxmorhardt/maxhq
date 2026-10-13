package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/stretchr/testify/assert"
)

type fakeRevocations struct {
	revoked bool
	err     error
	calls   int
}

func (f *fakeRevocations) Revoke(context.Context, string, time.Time) error { return nil }

func (f *fakeRevocations) IsRevoked(context.Context, string, int64) (bool, error) {
	f.calls++
	return f.revoked, f.err
}

func buildRouter(mw gin.HandlerFunc) (router *gin.Engine, reached *bool) {
	gin.SetMode(gin.TestMode)
	didReach := false
	router = gin.New()
	router.GET("/protected", mw, func(c *gin.Context) {
		didReach = true
		claims := reqctx.ClaimsFromContext(c.Request.Context())
		c.String(http.StatusOK, c.GetString(api.UserKey)+"|"+claims.Name)
	})
	return router, &didReach
}

func gatewayRequest(mutate func(h http.Header)) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/protected", http.NoBody)
	req.Header.Set(HeaderAuthEmail, "user@example.com")
	req.Header.Set(HeaderAuthName, "Test User")
	req.Header.Set(HeaderAuthEmailVerified, "true")
	req.Header.Set(HeaderAuthIssuedAt, strconv.FormatInt(time.Now().Add(-time.Minute).Unix(), 10))
	req.Header.Set(HeaderAuthExpiresAt, strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
	if mutate != nil {
		mutate(req.Header)
	}
	return req
}

func TestAuthenticate_AcceptsGatewayIdentity(t *testing.T) {
	revocations := &fakeRevocations{}
	r, reached := buildRouter(Authenticate(revocations))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, gatewayRequest(nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, *reached)
	assert.Equal(t, "user@example.com|Test User", w.Body.String())
	assert.Equal(t, 1, revocations.calls)
}

func TestAuthenticate_DefaultsNameToEmail(t *testing.T) {
	r, _ := buildRouter(Authenticate(nil))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, gatewayRequest(func(h http.Header) { h.Del(HeaderAuthName) }))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "user@example.com|user@example.com", w.Body.String())
}

func TestAuthenticate_RejectsIncompleteIdentity(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(h http.Header)
	}{
		{"missing email", func(h http.Header) { h.Del(HeaderAuthEmail) }},
		{"unverified email", func(h http.Header) { h.Set(HeaderAuthEmailVerified, "false") }},
		{"garbled verification", func(h http.Header) { h.Set(HeaderAuthEmailVerified, "maybe") }},
		{"missing iat", func(h http.Header) { h.Del(HeaderAuthIssuedAt) }},
		{"zero iat", func(h http.Header) { h.Set(HeaderAuthIssuedAt, "0") }},
		{"missing exp", func(h http.Header) { h.Del(HeaderAuthExpiresAt) }},
		{"expired", func(h http.Header) {
			h.Set(HeaderAuthExpiresAt, strconv.FormatInt(time.Now().Add(-time.Minute).Unix(), 10))
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r, reached := buildRouter(Authenticate(&fakeRevocations{}))

			w := httptest.NewRecorder()
			r.ServeHTTP(w, gatewayRequest(tt.mutate))

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			assert.False(t, *reached)
		})
	}
}

func TestAuthenticate_RejectsRevokedTokens(t *testing.T) {
	r, reached := buildRouter(Authenticate(&fakeRevocations{revoked: true}))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, gatewayRequest(nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.False(t, *reached)
}

func TestAuthenticate_FailsOpenWhenRevocationStoreErrors(t *testing.T) {
	r, reached := buildRouter(Authenticate(&fakeRevocations{err: assert.AnError}))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, gatewayRequest(nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, *reached)
}
