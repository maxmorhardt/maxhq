package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// contest stream event types; the strings are the contract with the web client
const (
	ContestSnapshotType    = "contest.snapshot"
	ContestUpdatedType     = "contest.updated"
	ContestDeletedType     = "contest.deleted"
	SquareUpdatedType      = "square.updated"
	QuarterRecordedType    = "quarter.recorded"
	ParticipantJoinedType  = "participant.joined"
	ParticipantUpdatedType = "participant.updated"
	ParticipantRemovedType = "participant.removed"
	AccessRevokedType      = "access.revoked"
)

const (
	SystemActor              = "system"
	ContestVisibilityPrivate = "private"
)

// the envelope every contest stream event shares; data holds the type's payload
type ContestEvent struct {
	Type      string          `json:"type"`
	ContestID uuid.UUID       `json:"contestId"`
	UpdatedBy string          `json:"updatedBy"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data,omitempty"`
}

func NewContestEvent(eventType string, contestID uuid.UUID, updatedBy string, data any) (*ContestEvent, error) {
	event := &ContestEvent{Type: eventType, ContestID: contestID, UpdatedBy: updatedBy, Timestamp: time.Now()}
	if data == nil {
		return event, nil
	}

	raw, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal %s data: %w", eventType, err)
	}
	event.Data = raw
	return event, nil
}

// the payload fields that can take a viewer's access away
type AccessFields struct {
	Visibility string `json:"visibility"`
	UserID     string `json:"userId"`
}
