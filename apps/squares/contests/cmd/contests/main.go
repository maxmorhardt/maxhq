package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/contests/docs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/maxmorhardt/maxstash/libs/go/platform/server"
)

// @title           Squares Contests API
// @version         1.0.0
// @description     Contests, squares, participants, invites, leaderboard, and stats for squares.maxstash.io. Served under /squares behind the gateway, which validates the bearer token.
// @securityDefinitions.apikey BearerAuth
// @type apiKey
// @in header
// @name Authorization
func main() {
	server.InitLogger(bootstrap.Service)

	if err := run(); err != nil {
		slog.Error("contests service failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load[model.ContestsConfig]()
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
