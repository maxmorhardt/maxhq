package model

import (
	"time"

	"github.com/google/uuid"
)

// contest event types, shared by the contests publisher, the realtime stream, and the frontend
const (
	SquareUpdateType          string = "square_update"
	ContestUpdateType         string = "contest_update"
	QuarterResultUpdateType   string = "quarter_result_update"
	QuarterResultRollbackType string = "quarter_result_rollback"
	ContestDeletedType        string = "contest_deleted"
	ParticipantRemovedType    string = "participant_removed"
	ParticipantAddedType      string = "participant_added"
	ConnectedType             string = "connected"
	RevokedType               string = "revoked"
)

type StreamResult string

const (
	StreamResultSuccess       StreamResult = "success"
	StreamResultBadRequest    StreamResult = "bad_request"
	StreamResultNotFound      StreamResult = "not_found"
	StreamResultUnauthorized  StreamResult = "unauthorized"
	StreamResultInternalError StreamResult = "internal_error"
	StreamResultUnavailable   StreamResult = "unavailable"
)

type StreamCloseReason string

const (
	StreamCloseClient         StreamCloseReason = "client"
	StreamCloseTokenExpired   StreamCloseReason = "token_expired"
	StreamCloseTokenRevoked   StreamCloseReason = "token_revoked"
	StreamCloseAccessRevoked  StreamCloseReason = "access_revoked"
	StreamCloseContestDeleted StreamCloseReason = "contest_deleted"
	StreamCloseConsumerFailed StreamCloseReason = "consumer_failed"
	StreamCloseServerShutdown StreamCloseReason = "server_shutdown"
)

// one event on squares.contests.<id>; realtime forwards it verbatim as the sse data payload
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

// what realtime needs to open a stream: the full contest and who is in it
type ContestSnapshot struct {
	Contest      *Contest             `json:"contest"`
	Participants []ContestParticipant `json:"participants"`
}

func NewConnectedEvent(contestID uuid.UUID, contest *Contest, participants []ContestParticipant) *ContestEvent {
	return &ContestEvent{
		Type:         ConnectedType,
		ContestID:    contestID,
		UpdatedBy:    "system",
		Timestamp:    time.Now(),
		Contest:      contest,
		Participants: participants,
	}
}

func NewRevokedEvent(contestID uuid.UUID) *ContestEvent {
	return &ContestEvent{
		Type:      RevokedType,
		ContestID: contestID,
		UpdatedBy: "system",
		Timestamp: time.Now(),
	}
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
