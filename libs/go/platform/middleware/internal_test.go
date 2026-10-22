package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func internalRouter(token string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/internal/x", RequireInternalToken(token), func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestRequireInternalToken(t *testing.T) {
	tests := []struct {
		name       string
		configured string
		sent       string
		want       int
	}{
		{"matching token", "s3cret", "s3cret", http.StatusOK},
		{"wrong token", "s3cret", "nope", http.StatusUnauthorized},
		{"missing token", "s3cret", "", http.StatusUnauthorized},
		{"unconfigured token rejects everything", "", "", http.StatusUnauthorized},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/internal/x", http.NoBody)
			if tt.sent != "" {
				req.Header.Set(HeaderInternalToken, tt.sent)
			}

			w := httptest.NewRecorder()
			internalRouter(tt.configured).ServeHTTP(w, req)

			assert.Equal(t, tt.want, w.Code)
		})
	}
}
