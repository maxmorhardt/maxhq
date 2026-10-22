package model

import "github.com/maxmorhardt/maxhq/libs/go/platform/config"

type AccountsConfig struct {
	Server    config.ServerConfig
	DB        config.DatabaseConfig
	Redis     config.RedisConfig
	Streams   config.StreamsConfig
	Internal  config.InternalConfig
	Contests  ContestsConfig
	SMTP      SMTPConfig
	Turnstile TurnstileConfig
}

type ContestsConfig struct {
	URL string `env:"CONTESTS_INTERNAL_URL" envDefault:"http://squares-contests:8080"`
}

type SMTPConfig struct {
	Host         string `env:"SMTP_HOST,required"`
	Port         int    `env:"SMTP_PORT,required"`
	User         string `env:"SMTP_USER,required"`
	Password     string `env:"SMTP_PASSWORD,required"`
	SupportEmail string `env:"SUPPORT_EMAIL,required"`
}

type TurnstileConfig struct {
	SecretKey string `env:"TURNSTILE_SECRET_KEY,required"`
	BaseURL   string `env:"TURNSTILE_BASE_URL" envDefault:"https://challenges.cloudflare.com"`
}
