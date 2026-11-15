package mail

import (
	"errors"
	"fmt"
	netmail "net/mail"
)

type Config struct {
	Host     string `env:"SMTP_HOST"`
	Port     int    `env:"SMTP_PORT" envDefault:"587"`
	User     string `env:"SMTP_USER"`
	Password string `env:"SMTP_PASSWORD"`
	From     string `env:"EMAIL_FROM"`
}

func (c *Config) Sender() string {
	if c.From != "" {
		return c.From
	}
	return c.User
}

func (c *Config) Validate() error {
	if c.Host == "" {
		return errors.New("SMTP_HOST is required")
	}
	if _, err := netmail.ParseAddress(c.Sender()); err != nil {
		return fmt.Errorf("EMAIL_FROM (or SMTP_USER when it is unset) must be an email address: %w", err)
	}
	return nil
}
