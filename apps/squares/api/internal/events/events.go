package events

import (
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
)

// one stream holds every squares event so a stream sequence orders them globally
const (
	StreamName  = "SQUARES"
	AllSubjects = "squares.>"
)

// contest events feed realtime streams; their payload is model.ContestEvent
const ContestSubjects = "squares.contests.>"

func ContestSubject(contestID uuid.UUID) string {
	return "squares.contests." + contestID.String()
}

// game events carry the full game so contests can keep its projection without asking games
const GameSubjects = "squares.games.>"

func GameSubject(gameID uuid.UUID) string {
	return "squares.games." + gameID.String()
}

type GameUpdated struct {
	Game model.Game `json:"game"`
}

// user events keep contests' copy of display names and initials in sync with accounts
const (
	UserSubjects       = "squares.users.>"
	UserUpdatedSubject = "squares.users.updated"
	UserDeletedSubject = "squares.users.deleted"
)

type UserUpdated struct {
	Email           string `json:"email"`
	DisplayName     string `json:"displayName"`
	DefaultInitials string `json:"defaultInitials"`
}

type UserDeleted struct {
	Email     string    `json:"email"`
	DeletedAt time.Time `json:"deletedAt"`
}
