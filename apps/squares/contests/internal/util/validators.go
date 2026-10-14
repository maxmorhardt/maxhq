package util

import (
	"regexp"

	"github.com/go-playground/validator/v10"
)

var contestNamePattern = regexp.MustCompile(`^[A-Za-z0-9\s\-_]+$`)

func ValidateContestName(fl validator.FieldLevel) bool {
	name := fl.Field().String()
	if name == "" {
		return true
	}

	return contestNamePattern.MatchString(name)
}
