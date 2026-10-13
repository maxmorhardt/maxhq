package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/api/docs/realtime"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/bootstrap"
)

// @title           Squares Realtime API
// @version         3.0.0
// @description     Server-sent contest events for squares.maxstash.io, resumable with Last-Event-ID. Served under /squares behind the gateway, which validates the bearer token.
// @securityDefinitions.apikey BearerAuth
// @type apiKey
// @in header
// @name Authorization
func main() {
	server.InitLogger(bootstrap.Service)

	if err := run(); err != nil {
		slog.Error("realtime service failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := server.LoadConfig[model.RealtimeConfig]()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	infra, err := bootstrap.Connect(ctx, cfg)
	if err != nil {
		return err
	}

	return bootstrap.New(cfg, infra, ctx.Done()).Run(ctx)
}
