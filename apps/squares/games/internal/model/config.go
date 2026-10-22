package model

import (
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
)

type GamesConfig struct {
	Server  config.ServerConfig
	DB      config.DatabaseConfig
	Redis   config.RedisConfig
	Streams config.StreamsConfig
	Worker  WorkerConfig
}

type WorkerConfig struct {
	Enabled        bool          `env:"SCORES_ENABLED" envDefault:"true"`
	ESPNBaseURL    string        `env:"ESPN_BASE_URL" envDefault:"https://site.api.espn.com"`
	ActiveInterval time.Duration `env:"SCORES_ACTIVE_INTERVAL" envDefault:"60s"`
	IdleInterval   time.Duration `env:"SCORES_IDLE_INTERVAL" envDefault:"6h"`
	LockKey        int64         `env:"SCORES_LOCK_KEY" envDefault:"910011"`
}
