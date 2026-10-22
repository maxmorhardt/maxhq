package server

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/swaggo/swag"
)

type testDoc struct{}

func (testDoc) ReadDoc() string { return `{"swagger":"2.0"}` }

func TestNewEngine_AppliesSharedMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := NewEngine(config.ServerConfig{AllowedOrigins: []string{"http://allowed.com"}, MetricsEnabled: true})
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/x", http.NoBody)
	req.Header.Set("Origin", "http://allowed.com")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "http://allowed.com", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestRegisterRootRoutes(t *testing.T) {
	swag.Register("server-test", testDoc{})
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterRootRoutes(r, NewHealthHandler(nil), "server-test")

	for _, path := range []string{"/health/live", "/health/ready", "/swagger", "/swagger/", "/swagger/index.html"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, http.NoBody))
		assert.Equal(t, http.StatusOK, w.Code, path)
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/swagger/doc.json", http.NoBody))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"swagger":"2.0"}`, w.Body.String())

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/swagger", http.NoBody))
	assert.True(t, strings.Contains(w.Body.String(), "/doc.json"))
}

func TestRegisterRootRoutes_UnknownSwaggerInstance(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterRootRoutes(r, NewHealthHandler(nil), "missing-instance")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/swagger/doc.json", http.NoBody))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestServe_ShutsDownWhenContextEnds(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := listener.Addr().(*net.TCPAddr).Port
	require.NoError(t, listener.Close())

	srv := NewHTTPServer(config.ServerConfig{Host: "127.0.0.1", Port: port}, http.NotFoundHandler(), 0)
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan error, 1)
	go func() { done <- Serve(ctx, srv) }()

	require.Eventually(t, func() bool {
		conn, dialErr := net.Dial("tcp", srv.Addr)
		if dialErr == nil {
			_ = conn.Close()
		}
		return dialErr == nil
	}, 2*time.Second, 10*time.Millisecond)

	cancel()
	select {
	case err := <-done:
		assert.NoError(t, err)
	case <-time.After(5 * time.Second):
		t.Fatal("server did not shut down")
	}
}

func TestServe_ReturnsListenErrors(t *testing.T) {
	srv := NewHTTPServer(config.ServerConfig{Port: -1}, http.NotFoundHandler(), time.Second)

	assert.Error(t, Serve(context.Background(), srv))
}

func TestInitLogger(t *testing.T) {
	assert.NotPanics(t, func() { InitLogger("test") })
}
