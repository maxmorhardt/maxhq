package mail

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfig_Sender(t *testing.T) {
	assert.Equal(t, "no-reply@example.com", (&Config{User: "no-reply@example.com"}).Sender())
	assert.Equal(t, "Squares <recaps@example.com>", (&Config{User: "emailapikey", From: "Squares <recaps@example.com>"}).Sender())
}

func TestConfig_Validate(t *testing.T) {
	assert.NoError(t, (&Config{Host: "smtp.example.com", User: "no-reply@example.com"}).Validate())
	assert.NoError(t, (&Config{Host: "smtp.example.com", User: "emailapikey", From: "Squares <recaps@example.com>"}).Validate())
	assert.ErrorContains(t, (&Config{User: "a@example.com"}).Validate(), "SMTP_HOST")
	assert.ErrorContains(t, (&Config{Host: "smtp.example.com", User: "emailapikey"}).Validate(), "EMAIL_FROM")
}
