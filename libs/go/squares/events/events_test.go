package events

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContestStream(t *testing.T) {
	id := uuid.MustParse("6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c")

	assert.Equal(t, "contest:6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c", ContestStream(id))
}

func TestContestEventHeaderReadsOnlyWhatRealtimeNeeds(t *testing.T) {
	raw := `{"type":"participant_removed","contestId":"6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c",
		"contest":{"visibility":"private","name":"x"},"participant":{"userId":"a@b.c","role":"viewer"},"updatedBy":"o"}`

	var h ContestEventHeader
	require.NoError(t, json.Unmarshal([]byte(raw), &h))

	assert.Equal(t, ParticipantRemovedType, h.Type)
	assert.Equal(t, ContestVisibilityPrivate, h.Contest.Visibility)
	assert.Equal(t, "a@b.c", h.Participant.UserID)
}

func TestSystemEvents(t *testing.T) {
	id := uuid.New()

	connected := NewConnectedEvent(id, json.RawMessage(`{"id":"c"}`), json.RawMessage(`[]`))
	raw, err := json.Marshal(connected)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"type":"connected"`)
	assert.Contains(t, string(raw), `"contest":{"id":"c"}`)
	assert.Contains(t, string(raw), `"participants":[]`)

	revoked := NewRevokedEvent(id)
	raw, err = json.Marshal(revoked)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"type":"revoked"`)
	assert.NotContains(t, string(raw), `"contest"`)
}
