package database

import (
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestTranslateError(t *testing.T) {
	assert.ErrorIs(t, TranslateError(gorm.ErrRecordNotFound), ErrNotFound)
	assert.ErrorIs(t, TranslateError(fmt.Errorf("load: %w", gorm.ErrRecordNotFound)), ErrNotFound)

	assert.ErrorIs(t, TranslateError(gorm.ErrDuplicatedKey), ErrDuplicate)

	other := errors.New("db down")
	assert.Equal(t, other, TranslateError(other))
	assert.NoError(t, TranslateError(nil))
}
