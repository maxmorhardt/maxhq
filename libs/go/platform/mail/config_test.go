package mail

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfig_Sender(t *testing.T) {
	assert.Equal(t, "no-reply@example.com", (&Config{User: "no-reply@example.com"}).Sender())
	assert.Equal(t, "Example <notify@example.com>", (&Config{User: "apikey", From: "Example <notify@example.com>"}).Sender())
}

func TestConfig_Validate(t *testing.T) {
	assert.NoError(t, (&Config{Host: "smtp.example.com", Port: 587, User: "no-reply@example.com"}).Validate())
	assert.NoError(t, (&Config{Host: "smtp.example.com", Port: 465, User: "apikey", From: "Example <notify@example.com>"}).Validate())
	assert.ErrorContains(t, (&Config{Port: 587, User: "a@example.com"}).Validate(), "SMTP_HOST")
	assert.ErrorContains(t, (&Config{Host: "smtp.example.com", User: "a@example.com"}).Validate(), "SMTP_PORT")
	assert.ErrorContains(t, (&Config{Host: "smtp.example.com", Port: 70000, User: "a@example.com"}).Validate(), "SMTP_PORT")
	assert.ErrorContains(t, (&Config{Host: "smtp.example.com", Port: 587, User: "apikey"}).Validate(), "EMAIL_FROM")
}
