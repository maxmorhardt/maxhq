package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/games/docs"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/maxmorhardt/maxstash/libs/go/platform/server"
)

// @title           Squares Games API
// @version         1.0.0
// @description     NFL schedule and live scores for squares.maxstash.io. Polls ESPN and publishes game events to the games stream. Served under /squares behind the gateway, which validates the bearer token.
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
	cfg, err := config.Load[model.GamesConfig]()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	infra, err := bootstrap.Connect(cfg)
	if err != nil {
		return err
	}

	return bootstrap.New(cfg, infra).Run(ctx)
}
