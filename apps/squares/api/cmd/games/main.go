package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/api/docs/games"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/games/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
)

// @title           Squares Games API
// @version         3.0.0
// @description     NFL schedule and live scores for squares.maxstash.io. Polls ESPN and publishes game events. Served under /squares behind the gateway, which validates the bearer token.
// @securityDefinitions.apikey BearerAuth
// @type apiKey
// @in header
// @name Authorization
func main() {
	server.InitLogger(bootstrap.Service)

	if err := run(); err != nil {
		slog.Error("games service failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := server.LoadConfig[model.GamesConfig]()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	infra, err := bootstrap.Connect(ctx, cfg)
	if err != nil {
		return err
	}

	return bootstrap.New(cfg, infra).Run(ctx)
}
