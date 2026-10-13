package events

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestSubjects(t *testing.T) {
	id := uuid.MustParse("6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c")

	assert.Equal(t, "squares.contests.6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c", ContestSubject(id))
	assert.Equal(t, "squares.games.6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c", GameSubject(id))
}
