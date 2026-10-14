package model

import (
	"encoding/base64"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
)

const (
	DefaultFeedLimit = 20
	MaxFeedLimit     = 50
)

type FeedRole string

const (
	FeedRoleAll    FeedRole = ""
	FeedRoleOwned  FeedRole = "owned"
	FeedRoleJoined FeedRole = "joined"
)

var FeedStatusGroups = map[string][]ContestStatus{
	"open":     {ContestStatusActive},
	"live":     {ContestStatusQ1, ContestStatusQ2, ContestStatusQ3, ContestStatusQ4},
	"finished": {ContestStatusFinished},
}

type FeedCursor struct {
	At time.Time
	ID uuid.UUID
}

func (c FeedCursor) Encode() string {
	raw := strconv.FormatInt(c.At.UnixMicro(), 10) + ":" + c.ID.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func DecodeFeedCursor(s string) (*FeedCursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, errs.ErrInvalidCursor
	}

	micros, id, ok := strings.Cut(string(raw), ":")
	if !ok {
		return nil, errs.ErrInvalidCursor
	}
	at, err := strconv.ParseInt(micros, 10, 64)
	if err != nil {
		return nil, errs.ErrInvalidCursor
	}
	parsed, err := uuid.Parse(id)
	if err != nil {
		return nil, errs.ErrInvalidCursor
	}

	return &FeedCursor{At: time.UnixMicro(at).UTC(), ID: parsed}, nil
}

type ContestFeedFilter struct {
	Role     FeedRole        `json:"role,omitempty"`
	Statuses []ContestStatus `json:"statuses,omitempty"`
	Search   string          `json:"search,omitempty"`
	Cursor   *FeedCursor     `json:"cursor,omitempty"`
	Limit    int             `json:"limit"`
}

type ContestSummary struct {
	ID             uuid.UUID         `json:"id"`
	Name           string            `json:"name" example:"Sunday Night Squares"`
	HomeTeam       string            `json:"homeTeam,omitempty" example:"New York Giants"`
	AwayTeam       string            `json:"awayTeam,omitempty" example:"Dallas Cowboys"`
	Status         ContestStatus     `json:"status" example:"ACTIVE"`
	Visibility     ContestVisibility `json:"visibility" example:"private"`
	Owner          string            `json:"owner" example:"user@example.com"`
	Role           ParticipantRole   `json:"role" example:"owner"`
	GameID         *uuid.UUID        `json:"gameId,omitempty"`
	GameTime       *time.Time        `json:"gameTime,omitempty"`
	ClaimedSquares int               `json:"claimedSquares" example:"42"`
	MySquares      int               `json:"mySquares" example:"5"`
	Version        int64             `json:"version" example:"3"`
	CreatedAt      time.Time         `json:"createdAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
}

type ContestFeedResponse struct {
	Contests   []ContestSummary `json:"contests"`
	NextCursor string           `json:"nextCursor,omitempty"`
}
