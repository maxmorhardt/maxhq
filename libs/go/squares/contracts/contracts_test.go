package contracts

import (
	"encoding/json"
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

func TestContestSnapshot_CarriesPlayers(t *testing.T) {
	var snap ContestSnapshot
	assert.NoError(t, json.Unmarshal([]byte(`{"contest":{},"players":[{"id":"a"}],"viewerId":"u"}`), &snap))
	assert.JSONEq(t, `[{"id":"a"}]`, string(snap.Players))
	assert.Equal(t, "u", snap.ViewerID)

	out, err := json.Marshal(ContestSnapshot{Contest: json.RawMessage(`{}`), Players: json.RawMessage(`[]`), ViewerID: "u"})
	assert.NoError(t, err)
	assert.JSONEq(t, `{"contest":{},"players":[],"viewerId":"u"}`, string(out))
}
