package events

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	SquareUpdateType          = "square_update"
	ContestUpdateType         = "contest_update"
	QuarterResultUpdateType   = "quarter_result_update"
	QuarterResultRollbackType = "quarter_result_rollback"
	ContestDeletedType        = "contest_deleted"
	ParticipantRemovedType    = "participant_removed"
	ParticipantAddedType      = "participant_added"

	ConnectedType = "connected"
	RevokedType   = "revoked"
)

const ContestVisibilityPrivate = "private"

type ContestEventHeader struct {
	Type        string             `json:"type"`
	ContestID   uuid.UUID          `json:"contestId"`
	Contest     *ContestVisibility `json:"contest,omitempty"`
	Participant *ParticipantRef    `json:"participant,omitempty"`
}

type ContestVisibility struct {
	Visibility string `json:"visibility"`
}

type ParticipantRef struct {
	UserID string `json:"userId"`
}

type SystemEvent struct {
	Type         string          `json:"type"`
	ContestID    uuid.UUID       `json:"contestId"`
	UpdatedBy    string          `json:"updatedBy"`
	Timestamp    time.Time       `json:"timestamp"`
	Contest      json.RawMessage `json:"contest,omitempty"`
	Participants json.RawMessage `json:"participants,omitempty"`
}

func NewConnectedEvent(contestID uuid.UUID, contest, participants json.RawMessage) *SystemEvent {
	return &SystemEvent{
		Type:         ConnectedType,
		ContestID:    contestID,
		UpdatedBy:    "system",
		Timestamp:    time.Now(),
		Contest:      contest,
		Participants: participants,
	}
}

func NewRevokedEvent(contestID uuid.UUID) *SystemEvent {
	return &SystemEvent{
		Type:      RevokedType,
		ContestID: contestID,
		UpdatedBy: "system",
		Timestamp: time.Now(),
	}
}
