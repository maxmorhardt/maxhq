package server

import (
	"context"
	"io/fs"
	"log/slog"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// the connections a service holds; DB is nil for services that own no schema
type Infra struct {
	DB    *gorm.DB
	NATS  *nats.Conn
	JS    jetstream.JetStream
	Redis *redis.Client
}

type InfraConfig struct {
	DB         *model.DatabaseConfig
	Schema     string
	Migrations fs.FS
	NATS       model.NATSConfig
	Redis      model.RedisConfig
}

// connects in dependency order and unwinds whatever opened if a later step fails
func Connect(ctx context.Context, cfg *InfraConfig) (*Infra, error) {
	infra := &Infra{}

	if cfg.DB != nil {
		db, err := database.InitDB(cfg.DB, cfg.Schema, cfg.Migrations)
		if err != nil {
			return nil, err
		}
		infra.DB = db
	}

	nc, err := messaging.InitNATS(cfg.NATS)
	if err != nil {
		infra.Close()
		return nil, err
	}
	infra.NATS = nc

	js, err := messaging.InitJetStream(ctx, nc, cfg.NATS)
	if err != nil {
		infra.Close()
		return nil, err
	}
	infra.JS = js

	rdb, err := cache.InitRedis(cfg.Redis)
	if err != nil {
		infra.Close()
		return nil, err
	}
	infra.Redis = rdb

	return infra, nil
}

// drains nats so in-flight acks land before the process exits
func (i *Infra) Close() {
	if i.NATS != nil {
		if err := i.NATS.Drain(); err != nil {
			slog.Warn("failed to drain nats", "error", err)
		}
	}
	if i.Redis != nil {
		if err := i.Redis.Close(); err != nil {
			slog.Warn("failed to close redis", "error", err)
		}
	}
	database.Close(i.DB)
}
