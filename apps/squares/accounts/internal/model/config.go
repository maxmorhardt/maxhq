package model

import (
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

type AccountsConfig struct {
	Server    config.ServerConfig
	DB        config.DatabaseConfig
	Redis     config.RedisConfig
	Streams   config.StreamsConfig
	Internal  config.InternalConfig
	Contests  ContestsConfig
	SMTP      config.SMTPConfig
	Contact   ContactConfig
	Turnstile TurnstileConfig
	Pseudonym pseudonym.Config
}

type ContestsConfig struct {
	URL string `env:"CONTESTS_INTERNAL_URL" envDefault:"http://squares-contests:8080"`
}

type ContactConfig struct {
	SupportEmail string `env:"SUPPORT_EMAIL,required"`
}

type TurnstileConfig struct {
	SecretKey string `env:"TURNSTILE_SECRET_KEY,required"`
	BaseURL   string `env:"TURNSTILE_BASE_URL" envDefault:"https://challenges.cloudflare.com"`
}
