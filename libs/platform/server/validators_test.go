package server

import (
	"testing"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSetupValidators(t *testing.T) {
	SetupValidators()

	v, ok := binding.Validator.Engine().(*validator.Validate)
	require.True(t, ok)

	// safestring
	assert.NoError(t, v.Var("hello world", "safestring"))
	assert.NoError(t, v.Var("", "safestring"), "empty is allowed")
	assert.Error(t, v.Var("bad<script>", "safestring"))
}

func TestRegisterValidation(t *testing.T) {
	RegisterValidation("onlyx", func(fl validator.FieldLevel) bool { return fl.Field().String() == "x" })

	v, ok := binding.Validator.Engine().(*validator.Validate)
	require.True(t, ok)
	assert.NoError(t, v.Var("x", "onlyx"))
	assert.Error(t, v.Var("y", "onlyx"))
}
