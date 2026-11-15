package email

import "github.com/maxmorhardt/maxhq/libs/go/platform/config"

type Config struct {
	Enabled bool   `env:"EMAIL_ENABLED" envDefault:"false"`
	WebURL  string `env:"WEB_URL" envDefault:"https://squares.maxhq.io"`
	SMTP    config.SMTPConfig
}
