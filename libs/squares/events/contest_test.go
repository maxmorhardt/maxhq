package events

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewContestEventWrapsThePayload(t *testing.T) {
	id := uuid.New()

	event, err := NewContestEvent(ContestSnapshotType, id, SystemActor, map[string]any{"contest": map[string]string{"id": "c"}})
	require.NoError(t, err)
	raw, err := json.Marshal(event)
	require.NoError(t, err)

	assert.Contains(t, string(raw), `"type":"contest.snapshot"`)
	assert.Contains(t, string(raw), `"updatedBy":"system"`)
	assert.Contains(t, string(raw), `"data":{"contest":{"id":"c"}}`)
}

func TestNewContestEventWithoutPayload(t *testing.T) {
	event, err := NewContestEvent(AccessRevokedType, uuid.New(), SystemActor, nil)
	require.NoError(t, err)
	raw, err := json.Marshal(event)
	require.NoError(t, err)

	assert.NotContains(t, string(raw), `"data"`)
}

func TestNewContestEventRejectsUnmarshalablePayload(t *testing.T) {
	_, err := NewContestEvent(SquareUpdatedType, uuid.New(), "u", make(chan int))

	assert.Error(t, err)
}

func TestAccessFieldsReadOnlyWhatRealtimeNeeds(t *testing.T) {
	var fields AccessFields
	require.NoError(t, json.Unmarshal([]byte(`{"visibility":"private","name":"x","userId":"a@b.c","role":"viewer"}`), &fields))

	assert.Equal(t, AccessFields{Visibility: ContestVisibilityPrivate, UserID: "a@b.c"}, fields)
}
