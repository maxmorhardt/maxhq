package internalapi

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestPaths(t *testing.T) {
	id := uuid.MustParse("6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c")

	assert.Equal(t, "/internal/contests/6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c/snapshot?user=a%2Bb%40c.d", SnapshotPath(id, "a+b@c.d"))
	assert.Equal(t, "/internal/users/a+b@c.d/activity", UserActivityPath("a+b@c.d"))
	assert.Equal(t, "/internal/users/a%2Fb/activity", UserActivityPath("a/b"))
}
