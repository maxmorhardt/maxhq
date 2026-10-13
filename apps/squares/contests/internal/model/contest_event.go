package model

import (
	"time"

	"github.com/maxmorhardt/maxstash/libs/squares/events"

	"github.com/google/uuid"
)

// contest event types; the strings are part of the contract with realtime and the frontend
const (
	SquareUpdateType          = events.SquareUpdateType
	ContestUpdateType         = events.ContestUpdateType
	QuarterResultUpdateType   = events.QuarterResultUpdateType
	QuarterResultRollbackType = events.QuarterResultRollbackType
	ContestDeletedType        = events.ContestDeletedType
	ParticipantRemovedType    = events.ParticipantRemovedType
	ParticipantAddedType      = events.ParticipantAddedType
)

// one event on the contest's stream; realtime forwards it verbatim as the sse data payload
type ContestEvent struct {
	Type          string               `json:"type"`
	ContestID     uuid.UUID            `json:"contestId"`
	UpdatedBy     string               `json:"updatedBy"`
	Timestamp     time.Time            `json:"timestamp"`
	Square        *Square              `json:"square,omitempty"`
	Contest       *Contest             `json:"contest,omitempty"`
	Participants  []ContestParticipant `json:"participants,omitempty"`
	QuarterResult *QuarterResult       `json:"quarterResult,omitempty"`
	Participant   *ContestParticipant  `json:"participant,omitempty"`
}

// what realtime needs to open a stream: the full contest and who is in it (contracts.ContestSnapshot on the wire)
type ContestSnapshot struct {
	Contest      *Contest             `json:"contest"`
	Participants []ContestParticipant `json:"participants"`
}

func NewSquareUpdateEvent(contestID uuid.UUID, updatedBy string, square *Square) *ContestEvent {
	return &ContestEvent{
		Type:      SquareUpdateType,
		ContestID: contestID,
		UpdatedBy: updatedBy,
		Timestamp: time.Now(),
		Square:    square,
	}
}

func NewQuarterResultUpdateEvent(contestID uuid.UUID, updatedBy string, quarterResult *QuarterResult) *ContestEvent {
	return &ContestEvent{
		Type:          QuarterResultUpdateType,
		ContestID:     contestID,
		UpdatedBy:     updatedBy,
		Timestamp:     time.Now(),
		QuarterResult: quarterResult,
	}
}

func NewQuarterResultRollbackEvent(contestID uuid.UUID, updatedBy string, quarterResult *QuarterResult, contest *Contest) *ContestEvent {
	return &ContestEvent{
		Type:          QuarterResultRollbackType,
		ContestID:     contestID,
		UpdatedBy:     updatedBy,
		Timestamp:     time.Now(),
		QuarterResult: quarterResult,
		Contest:       contest,
	}
}

func NewContestUpdateEvent(contestID uuid.UUID, updatedBy string, contest *Contest) *ContestEvent {
	return &ContestEvent{
		Type:      ContestUpdateType,
		ContestID: contestID,
		UpdatedBy: updatedBy,
		Timestamp: time.Now(),
		Contest:   contest,
	}
}

func NewContestDeletedEvent(contestID uuid.UUID, updatedBy string) *ContestEvent {
	return &ContestEvent{
		Type:      ContestDeletedType,
		ContestID: contestID,
		UpdatedBy: updatedBy,
		Timestamp: time.Now(),
	}
}

func NewParticipantRemovedEvent(contestID uuid.UUID, updatedBy string, participant *ContestParticipant) *ContestEvent {
	return &ContestEvent{
		Type:        ParticipantRemovedType,
		ContestID:   contestID,
		UpdatedBy:   updatedBy,
		Participant: participant,
		Timestamp:   time.Now(),
	}
}

func NewParticipantAddedEvent(contestID uuid.UUID, participant *ContestParticipant) *ContestEvent {
	return &ContestEvent{
		Type:        ParticipantAddedType,
		ContestID:   contestID,
		UpdatedBy:   participant.UserID,
		Participant: participant,
		Timestamp:   time.Now(),
	}
}
