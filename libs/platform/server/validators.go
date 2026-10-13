package server

import (
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/maxmorhardt/maxstash/libs/platform/strutil"
)

// registers the validators every service can use in binding tags
func SetupValidators() {
	RegisterValidation("safestring", validateSafeString)
}

// lets a service add its own binding tags; call it after NewEngine
func RegisterValidation(tag string, fn validator.Func) {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation(tag, fn)
	}
}

// blocks: < > { } [ ] \ | ` and other control characters
func validateSafeString(fl validator.FieldLevel) bool {
	str := fl.Field().String()
	if str == "" {
		return true
	}

	return strutil.IsSafeString(str)
}
