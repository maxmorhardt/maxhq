package server

import (
	"regexp"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

func SetupValidators() {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		_ = v.RegisterValidation("contestname", validateContestName)
		_ = v.RegisterValidation("safestring", validateSafeString)
	}
}

func validateContestName(fl validator.FieldLevel) bool {
	name := fl.Field().String()
	if name == "" {
		return true
	}

	matches, _ := regexp.MatchString(`^[A-Za-z0-9\s\-_]+$`, name)
	return matches
}

// blocks: < > { } [ ] \ | ` and other control characters
func validateSafeString(fl validator.FieldLevel) bool {
	str := fl.Field().String()
	if str == "" {
		return true
	}

	return util.IsSafeString(str)
}
