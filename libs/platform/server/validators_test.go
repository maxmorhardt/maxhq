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

	for _, s := range []string{"", "hello123", "hello, world!", "my-name"} {
		assert.NoError(t, v.Var(s, "safestring"), s)
	}
	for _, s := range []string{"a<b", "a>b", "a{b", "a}b", "a[b", "a]b", `a\b`, "a|b", "a`b"} {
		assert.Error(t, v.Var(s, "safestring"), s)
	}
}

func TestRegisterValidation(t *testing.T) {
	RegisterValidation("onlyx", func(fl validator.FieldLevel) bool { return fl.Field().String() == "x" })

	v, ok := binding.Validator.Engine().(*validator.Validate)
	require.True(t, ok)
	assert.NoError(t, v.Var("x", "onlyx"))
	assert.Error(t, v.Var("y", "onlyx"))
}
