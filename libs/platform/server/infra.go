package server

import (
	"io/fs"
	"log/slog"

	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// the connections a service holds; DB is nil for services that own no schema
type Infra struct {
	DB    *gorm.DB
	Redis *redis.Client
}

// DB is optional; KeyPrefix scopes every redis key and stream the service touches
type InfraConfig struct {
	DB         *config.DatabaseConfig
	Schema     string
	Migrations fs.FS
	Redis      config.RedisConfig
	KeyPrefix  string
	// lets the service start while redis is down, for services that only use it in ways that fail open
	RedisOptional bool
}

// connects in dependency order and unwinds whatever opened if a later step fails
func Connect(cfg *InfraConfig) (*Infra, error) {
	infra := &Infra{}

	if cfg.DB != nil {
		db, err := database.InitDB(cfg.DB, cfg.Schema, cfg.Migrations)
		if err != nil {
			return nil, err
		}
		infra.DB = db
	}

	cache.SetKeyPrefix(cfg.KeyPrefix)
	rdb, err := cache.NewClient(cfg.Redis)
	if err != nil {
		infra.Close()
		return nil, err
	}
	infra.Redis = rdb

	if err := cache.Ping(rdb); err != nil {
		if !cfg.RedisOptional {
			infra.Close()
			return nil, err
		}
		slog.Warn("redis is unavailable, starting anyway; caches are skipped and events wait in the outbox until it returns", "error", err)
	} else {
		slog.Info("redis connection established", "addr", rdb.Options().Addr)
	}

	return infra, nil
}

func (i *Infra) Close() {
	if i.Redis != nil {
		if err := i.Redis.Close(); err != nil {
			slog.Warn("failed to close redis", "error", err)
		}
	}
	database.Close(i.DB)
}
