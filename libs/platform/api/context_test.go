package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestClaimsFromContext(t *testing.T) {
	claims := &Claims{Email: "a@b.com", EmailVerified: true}

	assert.Equal(t, claims, ClaimsFromContext(context.WithValue(context.Background(), ClaimsKey, claims)))
	assert.Nil(t, ClaimsFromContext(context.Background()))
	assert.Nil(t, ClaimsFromContext(context.WithValue(context.Background(), ClaimsKey, "not claims")))
}

func TestSetContextValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodGet, "/", http.NoBody)

	SetContextValue(c, UserKey, "a@b.com")

	val, ok := c.Get(UserKey)
	assert.True(t, ok)
	assert.Equal(t, "a@b.com", val)
	assert.Equal(t, "a@b.com", c.Request.Context().Value(UserKey))
}
