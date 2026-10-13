package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/realtime/docs"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/maxmorhardt/maxstash/libs/go/platform/server"
)

// @title           Squares Realtime API
// @version         1.0.0
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
	cfg, err := config.Load[model.RealtimeConfig]()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	infra, err := bootstrap.Connect(cfg)
	if err != nil {
		return err
	}

	return bootstrap.New(cfg, infra, ctx.Done()).Run(ctx)
}
