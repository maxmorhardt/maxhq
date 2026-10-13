package server

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func StartMetricsServer(cfg config.ServerConfig) *http.Server {
	if !cfg.MetricsEnabled {
		slog.Info("metrics disabled")
		return nil
	}

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.MetricsPort),
		Handler:           promhttp.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	slog.Info("starting metrics server", "addr", srv.Addr)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("metrics server failed", "error", err)
		}
	}()

	return srv
}
