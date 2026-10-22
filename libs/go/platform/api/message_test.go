package api

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMessage(t *testing.T) {
	tests := []struct {
		err      error
		expected string
	}{
		{nil, ""},
		{errors.New(""), ""},
		{errors.New("something went wrong"), "Something went wrong"},
		{errors.New("Already uppercase"), "Already uppercase"},
		{errors.New("a"), "A"},
		{errors.New("404 not found"), "404 not found"},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.expected, Message(tt.err))
	}
}
