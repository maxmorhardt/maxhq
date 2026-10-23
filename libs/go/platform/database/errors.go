package database

import (
	"errors"

	"gorm.io/gorm"
)

var (
	ErrNotFound  = errors.New("record not found")
	ErrDuplicate = errors.New("duplicate record")
)

// repositories return these instead of gorm's errors so services never depend on gorm
func TranslateError(err error) error {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return ErrNotFound
	case errors.Is(err, gorm.ErrDuplicatedKey):
		return ErrDuplicate
	}
	return err
}
