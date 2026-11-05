package model

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	ownerEmail       = "owner@example.com"
	participantEmail = "participant@example.com"
)

func usePseudonymKey(t *testing.T) {
	t.Helper()
	require.NoError(t, pseudonym.SetKey("0123456789abcdef0123456789abcdef"))
}

func marshal(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return string(b)
}

func TestPseudonyms_NoEmailOrFullNameLeavesTheService(t *testing.T) {
	usePseudonymKey(t)

	// a name falls back to the email when the token carries none
	square := Square{Owner: participantEmail, OwnerName: participantEmail, CreatedBy: ownerEmail, UpdatedBy: participantEmail}
	result := QuarterResult{Winner: participantEmail, WinnerName: participantEmail, CreatedBy: "system", UpdatedBy: ownerEmail}
	participant := ContestParticipant{UserID: participantEmail, DisplayName: participantEmail}
	contest := &Contest{
		Owner: ownerEmail, CreatedBy: ownerEmail, UpdatedBy: participantEmail,
		Squares:        []Square{square},
		QuarterResults: []QuarterResult{result},
	}

	payloads := map[string]any{
		"square":      square,
		"result":      &result,
		"participant": participant,
		"contest":     contest,
		"snapshot":    ContestSnapshot{Contest: contest, Participants: []ContestParticipant{participant}},
		"feed":        ContestFeedResponse{Contests: []ContestSummary{{OwnerName: "Olive Owens"}}},
		"preview":     &InvitePreviewResponse{OwnerName: "Olive Owens"},
		"random":      RandomClaimResponse{Squares: []Square{square}},
	}
	for name, payload := range payloads {
		out := marshal(t, payload)
		assert.NotContains(t, out, "@", name)
		assert.NotContains(t, out, "Owens", name)
	}
}

func TestPseudonyms_ReplaceEmailsAndKeepTheRest(t *testing.T) {
	usePseudonymKey(t)

	var square map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, Square{ID: uuid.New(), Owner: participantEmail, OwnerName: "Pat Parker", Value: "PP", UpdatedBy: "system"})), &square))
	assert.Equal(t, pseudonym.Of(participantEmail), square["owner"])
	assert.Equal(t, "Pat P.", square["ownerName"], "other participants only get the short name")
	assert.Equal(t, "PP", square["value"])
	assert.NotContains(t, square, "updatedBy", "clients never need who last touched a row")

	var ghost map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, Square{Owner: GhostUser})), &ghost))
	assert.Equal(t, GhostUser, ghost["owner"])
	assert.Equal(t, "", ghost["ownerName"])

	var empty map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, Square{})), &empty))
	assert.Equal(t, "", empty["ownerName"])

	var nameless map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, Square{Owner: participantEmail})), &nameless))
	assert.Equal(t, pseudonym.Unnamed, nameless["ownerName"])

	var result map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, QuarterResult{Winner: participantEmail})), &result))
	assert.Equal(t, pseudonym.Of(participantEmail), result["winner"])

	var participant map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, ContestParticipant{UserID: participantEmail, DisplayName: "Pat Parker"})), &participant))
	assert.Equal(t, pseudonym.Of(participantEmail), participant["userId"])
	assert.Equal(t, "Pat P.", participant["displayName"])

	var unnamed map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, ContestParticipant{UserID: participantEmail})), &unnamed))
	assert.Equal(t, pseudonym.Unnamed, unnamed["displayName"])

	var preview map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, InvitePreviewResponse{OwnerName: "Olive Owens"})), &preview))
	assert.Equal(t, "Olive O.", preview["ownerName"])

	var ban map[string]any
	require.NoError(t, json.Unmarshal([]byte(marshal(t, ContestBan{UserID: participantEmail, DisplayName: "Pat Parker"})), &ban))
	assert.Equal(t, pseudonym.Of(participantEmail), ban["userId"])
	assert.Equal(t, "Pat Parker", ban["displayName"], "only the owner lists bans, so they get the full name")
	assert.NotContains(t, ban, "contestId")
}

func TestContest_InviteTokenStaysOffTheWire(t *testing.T) {
	usePseudonymKey(t)

	out := marshal(t, &Contest{Owner: ownerEmail, InviteToken: "secret-token"})
	assert.NotContains(t, out, "secret-token")
}

// the feed is cached as JSON, so a cached copy is masked already and must come back out unchanged
func TestPseudonyms_SurviveACacheRoundTrip(t *testing.T) {
	usePseudonymKey(t)

	var cached ContestFeedResponse
	require.NoError(t, json.Unmarshal([]byte(marshal(t, ContestFeedResponse{Contests: []ContestSummary{{OwnerName: "Olive Owens"}}})), &cached))
	require.Equal(t, "Olive O.", cached.Contests[0].OwnerName)

	var served ContestFeedResponse
	require.NoError(t, json.Unmarshal([]byte(marshal(t, cached)), &served))
	assert.Equal(t, "Olive O.", served.Contests[0].OwnerName)
}
