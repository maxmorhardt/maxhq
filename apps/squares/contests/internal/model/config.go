package model

import (
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

type ContestsConfig struct {
	Server    config.ServerConfig
	DB        config.DatabaseConfig
	Redis     config.RedisConfig
	Streams   config.StreamsConfig
	Internal  config.InternalConfig
	Pseudonym pseudonym.Config
}
