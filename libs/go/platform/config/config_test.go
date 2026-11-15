package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSMTPConfig_Sender(t *testing.T) {
	assert.Equal(t, "no-reply@example.com", (&SMTPConfig{User: "no-reply@example.com"}).Sender())
	assert.Equal(t, "Example <notify@example.com>", (&SMTPConfig{User: "apikey", From: "Example <notify@example.com>"}).Sender())
}
