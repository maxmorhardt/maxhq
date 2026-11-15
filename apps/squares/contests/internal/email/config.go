package email

import (
	"errors"
	"net/mail"
)

type Config struct {
	Enabled      bool   `env:"EMAIL_ENABLED" envDefault:"false"`
	From         string `env:"EMAIL_FROM"`
	WebURL       string `env:"WEB_URL" envDefault:"https://squares.maxhq.io"`
	SMTPHost     string `env:"SMTP_HOST"`
	SMTPPort     int    `env:"SMTP_PORT" envDefault:"587"`
	SMTPUser     string `env:"SMTP_USER"`
	SMTPPassword string `env:"SMTP_PASSWORD"`
}

func (c *Config) Validate() error {
	if !c.Enabled {
		return nil
	}
	if _, err := mail.ParseAddress(c.From); err != nil {
		return errors.New(`EMAIL_FROM must be an address like "Squares <recaps@example.com>"`)
	}
	if c.SMTPHost == "" {
		return errors.New("SMTP_HOST is required when EMAIL_ENABLED is true")
	}
	return nil
}
