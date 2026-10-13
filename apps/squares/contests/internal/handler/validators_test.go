package handler

import (
	"testing"

	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateContestName(t *testing.T) {
	v := validator.New()
	require.NoError(t, v.RegisterValidation("contestname", ValidateContestName))

	assert.NoError(t, v.Var("My-Contest_1", "contestname"))
	assert.NoError(t, v.Var("", "contestname"), "empty is allowed")
	assert.Error(t, v.Var("bad@name!", "contestname"))
}
