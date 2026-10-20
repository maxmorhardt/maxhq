package events

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestContestStream(t *testing.T) {
	id := uuid.MustParse("6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c")

	assert.Equal(t, "contest:6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c", ContestStream(id))
}
