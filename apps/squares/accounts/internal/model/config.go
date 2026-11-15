package model

import (
	"fmt"
	"net/mail"

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
	SMTP      SMTPConfig
	Turnstile TurnstileConfig
	Pseudonym pseudonym.Config
}

type ContestsConfig struct {
	URL string `env:"CONTESTS_INTERNAL_URL" envDefault:"http://squares-contests:8080"`
}

type SMTPConfig struct {
	Host         string `env:"SMTP_HOST,required"`
	Port         int    `env:"SMTP_PORT,required"`
	User         string `env:"SMTP_USER,required"`
	Password     string `env:"SMTP_PASSWORD,required"`
	From         string `env:"EMAIL_FROM"`
	SupportEmail string `env:"SUPPORT_EMAIL,required"`
}

func (c *SMTPConfig) Validate() error {
	if _, err := mail.ParseAddress(c.Sender()); err != nil {
		return fmt.Errorf("EMAIL_FROM (or SMTP_USER when it is unset) must be an email address: %w", err)
	}
	return nil
}

func (c *SMTPConfig) Sender() string {
	if c.From != "" {
		return c.From
	}
	return c.User
}

type TurnstileConfig struct {
	SecretKey string `env:"TURNSTILE_SECRET_KEY,required"`
	BaseURL   string `env:"TURNSTILE_BASE_URL" envDefault:"https://challenges.cloudflare.com"`
}
