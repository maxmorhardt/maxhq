package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxstash/apps/squares/api/docs/accounts"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/server"
)

// @title           Squares Accounts API
// @version         3.0.0
// @description     Profiles, account deletion, and the contact form for squares.maxstash.io. Served under /squares behind the gateway, which validates the bearer token.
// @securityDefinitions.apikey BearerAuth
// @type apiKey
// @in header
// @name Authorization
func main() {
	server.InitLogger(bootstrap.Service)

	if err := run(); err != nil {
		slog.Error("accounts service failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := server.LoadConfig[model.AccountsConfig]()
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
