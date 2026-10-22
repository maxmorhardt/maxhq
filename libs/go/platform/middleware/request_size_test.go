package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/iotest"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestSizeLimit_SmallBodyPasses(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader("field=value"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	sizeRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func sizeRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestSizeLimitMiddleware())
	r.POST("/x", func(c *gin.Context) { c.Status(http.StatusOK) })
	return r
}

func TestRequestSizeLimit_TooLargeRejected(t *testing.T) {
	body := "field=" + strings.Repeat("a", (1<<20)+16)
	req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	sizeRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}

func jsonSizeRouter(seen *string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestSizeLimitMiddleware())
	r.POST("/x", func(c *gin.Context) {
		var body struct {
			Name string `json:"name"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		*seen = body.Name
		c.Status(http.StatusOK)
	})
	return r
}

func TestRequestSizeLimit_JSONBodyReachesTheHandlerIntact(t *testing.T) {
	var seen string
	req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(`{"name":"squares"}`))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	jsonSizeRouter(&seen).ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "squares", seen)
}

func TestRequestSizeLimit_OversizedJSONIs413(t *testing.T) {
	var seen string
	body := `{"name":"` + strings.Repeat("a", 1<<20) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	jsonSizeRouter(&seen).ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	assert.Empty(t, seen, "the handler never runs")
}

func TestRequestSizeLimit_OversizedChunkedBodyIs413(t *testing.T) {
	var seen string
	req := httptest.NewRequest(http.MethodPost, "/x", io.NopCloser(strings.NewReader(strings.Repeat("a", (1<<20)+1))))
	req.ContentLength = -1
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	jsonSizeRouter(&seen).ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}

func TestRequestSizeLimit_UnreadableBodyIs400(t *testing.T) {
	var seen string
	req := httptest.NewRequest(http.MethodPost, "/x", io.NopCloser(iotest.ErrReader(io.ErrUnexpectedEOF)))
	req.ContentLength = -1

	w := httptest.NewRecorder()
	jsonSizeRouter(&seen).ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRequestSizeLimit_NoBodyPasses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestSizeLimitMiddleware())
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/x", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
}
