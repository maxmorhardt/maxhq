package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSMTPConfig_Sender(t *testing.T) {
	assert.Equal(t, "no-reply@example.com", (&SMTPConfig{User: "no-reply@example.com"}).Sender())
	assert.Equal(t, "Squares <contact@example.com>", (&SMTPConfig{User: "emailapikey", From: "Squares <contact@example.com>"}).Sender())
}
