package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestPathUUID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var got uuid.UUID
	r := gin.New()
	r.GET("/c/:id/s/:squareId", func(c *gin.Context) {
		if id, ok := PathUUID(c, "id"); ok {
			if sq, ok := PathUUID(c, "squareId"); ok {
				got = sq
				_ = id
				c.Status(http.StatusOK)
			}
		}
	})

	want := uuid.New()
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/c/"+uuid.NewString()+"/s/"+want.String(), http.NoBody))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, want, got)

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/c/nope/s/"+want.String(), http.NoBody))
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid ID")

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/c/"+uuid.NewString()+"/s/nope", http.NoBody))
	assert.Contains(t, w.Body.String(), "Invalid square ID")
}
