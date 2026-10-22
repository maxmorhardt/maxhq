package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/maxmorhardt/maxhq/apps/squares/accounts/docs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/bootstrap"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/maxmorhardt/maxhq/libs/go/platform/server"
)

// @title           Squares Accounts API
// @version         1.0.0
// @description     Profiles, account deletion, and the contact form for squares.maxhq.io.
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
	cfg, err := config.Load[model.AccountsConfig]()
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
