package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSMTPConfig_Validate(t *testing.T) {
	assert.NoError(t, (&SMTPConfig{User: "no-reply@example.com"}).Validate())
	assert.NoError(t, (&SMTPConfig{User: "emailapikey", From: "Squares <contact@example.com>"}).Validate())
	assert.ErrorContains(t, (&SMTPConfig{User: "emailapikey"}).Validate(), "EMAIL_FROM")
}

func TestSMTPConfig_Sender(t *testing.T) {
	assert.Equal(t, "no-reply@example.com", (&SMTPConfig{User: "no-reply@example.com"}).Sender())
	assert.Equal(t, "Squares <contact@example.com>", (&SMTPConfig{User: "emailapikey", From: "Squares <contact@example.com>"}).Sender())
}
