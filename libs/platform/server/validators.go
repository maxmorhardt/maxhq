package server

import (
	"regexp"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var dangerousChars = regexp.MustCompile(`[<>{}[\]\\|` + "`" + `]`)

func SetupValidators() {
	RegisterValidation("safestring", validateSafeString)
}

func RegisterValidation(tag string, fn validator.Func) {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation(tag, fn)
	}
}

func validateSafeString(fl validator.FieldLevel) bool {
	str := fl.Field().String()
	if str == "" {
		return true
	}

	return !dangerousChars.MatchString(str)
}
