package model

import "github.com/maxmorhardt/maxstash/libs/platform/config"

type ContestsConfig struct {
	Server   config.ServerConfig
	DB       config.DatabaseConfig
	Redis    config.RedisConfig
	Streams  config.StreamsConfig
	Internal config.InternalConfig
}
