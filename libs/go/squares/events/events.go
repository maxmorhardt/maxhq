package events

import (
	"time"

	"github.com/google/uuid"
)

const (
	GamesStream = "games"
	UsersStream = "users"
)

func ContestStream(contestID uuid.UUID) string {
	return "contest:" + contestID.String()
}

const (
	GameUpdatedType = "game.updated"
	UserUpdatedType = "user.updated"
	UserDeletedType = "user.deleted"
)

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

type GameScore struct {
	ID        uuid.UUID `json:"id"`
	Quarter   int       `json:"quarter"`
	HomeScore int       `json:"homeScore"`
	AwayScore int       `json:"awayScore"`
}

const (
	GameStatusScheduled  = "scheduled"
	GameStatusInProgress = "in_progress"
	GameStatusFinal      = "final"
	GameStatusPostponed  = "postponed"
	GameStatusCanceled   = "canceled"
)

type GameUpdated struct {
	Game Game `json:"game"`
}

type UserUpdated struct {
	Email           string `json:"email"`
	DisplayName     string `json:"displayName"`
	DefaultInitials string `json:"defaultInitials"`
}

type UserDeleted struct {
	Email     string    `json:"email"`
	DeletedAt time.Time `json:"deletedAt"`
}
