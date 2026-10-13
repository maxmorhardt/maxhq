// Package contracts is the contract for the /internal endpoints contests serves to the other squares
// services. Those routes are never exposed by the gateway and require the shared internal token.
package contracts

import (
	"encoding/json"
	"net/url"
	"time"

	"github.com/google/uuid"
)

// what realtime needs to open a stream: the full contest and who is in it, passed to the browser untouched.
// 403 means the user may not watch, 404 that the contest does not exist
func SnapshotPath(contestID uuid.UUID, user string) string {
	return "/internal/contests/" + contestID.String() + "/snapshot?user=" + url.QueryEscape(user)
}

type ContestSnapshot struct {
	Contest      json.RawMessage `json:"contest"`
	Participants json.RawMessage `json:"participants"`
}

// what accounts needs from contests before it creates or deletes a profile
func UserActivityPath(email string) string {
	return "/internal/users/" + url.PathEscape(email) + "/activity"
}

type UserActiveContest struct {
	ID    string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name  string `json:"name" example:"test"`
	Owner string `json:"owner" example:"user@example.com"`
	Role  string `json:"role" example:"owner"`
}

type UserActivitySummary struct {
	ActiveContests []UserActiveContest `json:"activeContests"`
	FirstActivity  *time.Time          `json:"firstActivity,omitempty"`
}
