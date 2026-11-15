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
	_, err := c.sender()
	return err
}

func (c *Config) sender() (*netmail.Address, error) {
	if c.Host == "" {
		return nil, errors.New("SMTP_HOST is required")
	}
	if c.Port < 1 || c.Port > 65535 {
		return nil, fmt.Errorf("SMTP_PORT must be between 1 and 65535, got %d", c.Port)
	}
	from, err := netmail.ParseAddress(c.Sender())
	if err != nil {
		return nil, fmt.Errorf("EMAIL_FROM (or SMTP_USER when it is unset) must be an email address: %w", err)
	}
	return from, nil
}
