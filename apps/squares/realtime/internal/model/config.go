package model

import (
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/config"
)

type RealtimeConfig struct {
	Server   config.ServerConfig
	Redis    config.RedisConfig
	Internal config.InternalConfig
	Contests ContestsConfig
	Stream   StreamConfig
}

type ContestsConfig struct {
	URL string `env:"CONTESTS_INTERNAL_URL" envDefault:"http://squares-contests:8080"`
}

type StreamConfig struct {
	HeartbeatInterval  time.Duration `env:"SSE_HEARTBEAT_INTERVAL" envDefault:"25s"`
	RevocationInterval time.Duration `env:"SSE_REVOCATION_INTERVAL" envDefault:"5m"`
}
