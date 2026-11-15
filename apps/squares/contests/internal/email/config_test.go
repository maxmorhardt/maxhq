package email

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfig_Validate(t *testing.T) {
	valid := Config{Enabled: true, From: "Squares <recaps@example.com>", SMTPHost: "smtp.example.com"}

	cases := map[string]struct {
		cfg     Config
		wantErr string
	}{
		"disabled needs nothing": {cfg: Config{}},
		"enabled and complete":   {cfg: valid},
		"bad from":               {cfg: Config{Enabled: true, From: "nope", SMTPHost: "smtp.example.com"}, wantErr: "EMAIL_FROM"},
		"no host":                {cfg: Config{Enabled: true, From: "recaps@example.com"}, wantErr: "SMTP_HOST"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			err := tc.cfg.Validate()
			if tc.wantErr == "" {
				assert.NoError(t, err)
				return
			}
			assert.ErrorContains(t, err, tc.wantErr)
		})
	}
}
