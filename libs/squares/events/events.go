// Package events is the contract for the events squares services exchange through redis streams.
//
// Each service owns the streams it writes: contests writes one stream per contest, games writes the games
// stream, and accounts writes the users stream. Payloads are JSON; the entry type says how to decode them.
package events

import (
	"time"

	"github.com/google/uuid"
)

// logical stream names; the streams library adds the app's key prefix
const (
	GamesStream = "games"
	UsersStream = "users"
)

// every event about one contest, in order; realtime replays it to reconnecting viewers
func ContestStream(contestID uuid.UUID) string {
	return "contest:" + contestID.String()
}

// entry types on the games and users streams
const (
	GameUpdatedType = "game.updated"
	UserUpdatedType = "user.updated"
	UserDeletedType = "user.deleted"
)

// a game as games publishes it: everything contests needs to keep its own copy without asking games
type Game struct {
	ID         uuid.UUID   `json:"id"`
	ESPNID     string      `json:"espnId"`
	HomeTeam   string      `json:"homeTeam"`
	AwayTeam   string      `json:"awayTeam"`
	HomeAbbr   string      `json:"homeAbbr"`
	AwayAbbr   string      `json:"awayAbbr"`
	GameTime   time.Time   `json:"gameTime"`
	Week       int         `json:"week"`
	Season     int         `json:"season"`
	SeasonType int         `json:"seasonType"`
	Status     string      `json:"status"`
	Period     int         `json:"period"`
	HomeScore  int         `json:"homeScore"`
	AwayScore  int         `json:"awayScore"`
	Scores     []GameScore `json:"scores,omitempty"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

// the score at the end of one completed quarter
type GameScore struct {
	ID        uuid.UUID `json:"id"`
	Quarter   int       `json:"quarter"`
	HomeScore int       `json:"homeScore"`
	AwayScore int       `json:"awayScore"`
}

// game statuses as they appear in Game.Status
const (
	GameStatusScheduled  = "scheduled"
	GameStatusInProgress = "in_progress"
	GameStatusFinal      = "final"
)

type GameUpdated struct {
	Game Game `json:"game"`
}

// keeps contests' copy of display names and initials in sync with accounts
type UserUpdated struct {
	Email           string `json:"email"`
	DisplayName     string `json:"displayName"`
	DefaultInitials string `json:"defaultInitials"`
}

type UserDeleted struct {
	Email     string    `json:"email"`
	DeletedAt time.Time `json:"deletedAt"`
}
