package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
)

const (
	readHeaderTimeout = 10 * time.Second
	readTimeout       = 30 * time.Second
	idleTimeout       = 120 * time.Second
	shutdownTimeout   = 10 * time.Second
)

func InitLogger(service string) {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo,
		AddSource: true,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.SourceKey {
				if source, ok := a.Value.Any().(*slog.Source); ok && source != nil {
					a.Value = slog.StringValue(fmt.Sprintf("%s:%d", filepath.Base(source.File), source.Line))
				}
			}
			return a
		},
	})).With("service", service)
	slog.SetDefault(logger)
}

func NewEngine(cfg config.ServerConfig) *gin.Engine {
	r := gin.New()

	r.Use(gin.Recovery())
	r.Use(middleware.RequestSizeLimitMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))
	r.Use(middleware.LoggerMiddleware)
	if cfg.MetricsEnabled {
		r.Use(middleware.PrometheusMiddleware)
	}

	SetupValidators()
	return r
}

func NewHTTPServer(cfg config.ServerConfig, handler http.Handler, writeTimeout time.Duration) *http.Server {
	return &http.Server{
		Addr:              net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
		Handler:           handler,
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}
}

func Serve(ctx context.Context, srv *http.Server) error {
	errCh := make(chan error, 1)
	go func() {
		slog.Info("server started", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	return nil
}
