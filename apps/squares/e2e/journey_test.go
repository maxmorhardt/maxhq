package e2e

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/libs/go/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// a game goes from espn through games, contests, and realtime to a viewer's browser
func TestJourney_GameKickoffStartsAndScoresALinkedContestLive(t *testing.T) {
	espnID := "e2e-" + uuid.NewString()[:8]
	kickoff := time.Now().Add(30 * time.Minute)
	espn.set(&fakeGame{ID: espnID, Kickoff: kickoff, State: "pre", Home: "Lions", Away: "Bears"})

	// games publishes the schedule; contests links only games it has heard about
	var gameID string
	require.Eventually(t, func() bool {
		var upcoming []struct {
			ID     string `json:"id"`
			ESPNID string `json:"espnId"`
		}
		resp := testkit.Call(t, gamesURL, testkit.As(ownerUser), http.MethodGet, "/games/upcoming", nil)
		if resp.Status != http.StatusOK {
			return false
		}
		resp.Decode(t, &upcoming)
		for _, g := range upcoming {
			if g.ESPNID == espnID {
				gameID = g.ID
				return true
			}
		}
		return false
	}, eventually, 200*time.Millisecond, "games ingests the schedule from espn")

	signIn(t, ownerUser)
	var c contest
	require.Eventually(t, func() bool {
		body := map[string]any{"owner": ownerUser, "name": "Kickoff " + espnID[4:], "maxSquares": 100, "gameId": gameID}
		resp := testkit.Call(t, contestsURL, testkit.As(ownerUser), http.MethodPut, "/contests", body)
		if resp.Status != http.StatusOK {
			return false
		}
		resp.Decode(t, &c)
		return true
	}, eventually, 200*time.Millisecond, "contests receives the game from the games stream")
	assert.Equal(t, "Lions", c.HomeTeam, "teams come from the game")

	for _, sq := range snapshot(t, ownerUser, c.ID).Contest.Squares {
		claim(t, ownerUser, c.ID, sq.ID)
	}

	stream := watch(t, ownerUser, c.ID, "")
	require.Equal(t, http.StatusOK, stream.Status)
	assert.Equal(t, "connected", stream.Next(t).Kind)

	// kickoff, then the first quarter ends 7-3
	espn.set(&fakeGame{ID: espnID, Kickoff: kickoff, State: "in", Period: 2, Home: "Lions", Away: "Bears", HomeLine: []int{7}, AwayLine: []int{3}})

	nextOfKind(t, stream, "contest_update")
	result := nextOfKind(t, stream, "quarter_result_update")
	var update struct {
		QuarterResult struct {
			Quarter       int `json:"quarter"`
			HomeTeamScore int `json:"homeTeamScore"`
			AwayTeamScore int `json:"awayTeamScore"`
		} `json:"quarterResult"`
	}
	result.Decode(t, &update)
	assert.Equal(t, 1, update.QuarterResult.Quarter)
	assert.Equal(t, 7, update.QuarterResult.HomeTeamScore)
	assert.Equal(t, 3, update.QuarterResult.AwayTeamScore)
}

func TestJourney_InviteClaimAndResumeAfterADroppedConnection(t *testing.T) {
	signIn(t, ownerUser)
	signIn(t, memberUser)
	c := createContest(t, ownerUser, "Resume "+uuid.NewString()[:6], 50)

	invite := testkit.Call(t, contestsURL, testkit.As(ownerUser), http.MethodPost, "/contests/"+c.ID.String()+"/invites",
		map[string]any{"maxSquares": 50, "role": "participant"})
	require.Equal(t, http.StatusOK, invite.Status, string(invite.Body))
	var created struct {
		Token string `json:"token"`
	}
	invite.Decode(t, &created)
	require.Equal(t, http.StatusCreated, testkit.Call(t, contestsURL, testkit.As(memberUser), http.MethodPost, "/invites/"+created.Token+"/redeem", nil).Status)

	squares := snapshot(t, memberUser, c.ID).Contest.Squares
	first := watch(t, memberUser, c.ID, "")
	first.Next(t)
	claim(t, memberUser, c.ID, squares[0].ID)
	seen := nextOfKind(t, first, "square_update")
	first.Close()

	// these happen while the member is offline
	claim(t, ownerUser, c.ID, squares[1].ID)
	claim(t, ownerUser, c.ID, squares[2].ID)

	resumed := watch(t, memberUser, c.ID, seen.ID)
	missed := make([]uuid.UUID, 0, 2)
	for range 2 {
		var e struct {
			Square square `json:"square"`
		}
		resumed.Next(t).Decode(t, &e)
		missed = append(missed, e.Square.ID)
	}
	assert.Equal(t, []uuid.UUID{squares[1].ID, squares[2].ID}, missed, "only what was missed, in order, without a snapshot")
}

func TestJourney_ProfileInitialsCascadeToLiveSquaresAndViewers(t *testing.T) {
	user := "initials-" + uuid.NewString()[:6] + "@squares.test"
	signIn(t, user)
	c := createContest(t, user, "Initials "+uuid.NewString()[:6], 10)
	sq := snapshot(t, user, c.ID).Contest.Squares[0]
	claim(t, user, c.ID, sq.ID)

	stream := watch(t, user, c.ID, "")
	stream.Next(t)

	update := testkit.Call(t, accountsURL, testkit.As(user), http.MethodPatch, "/users/me", map[string]string{"defaultInitials": "ZZ"})
	require.Equal(t, http.StatusOK, update.Status, string(update.Body))

	var e struct {
		Square square `json:"square"`
	}
	nextOfKind(t, stream, "square_update").Decode(t, &e)
	assert.Equal(t, sq.ID, e.Square.ID)
	assert.Equal(t, "ZZ", e.Square.Value, "accounts' user.updated reaches contests, whose square_update reaches the viewer")
}

func TestJourney_AccountDeletionRevokesEverywhereAndScrubsContests(t *testing.T) {
	user := "deleted-" + uuid.NewString()[:6] + "@squares.test"
	signedIn := testkit.As(user)
	signIn(t, user)

	// an owned live contest blocks deletion, which accounts learns by asking contests
	c := createContest(t, user, "Doomed "+uuid.NewString()[:6], 10)
	assert.Equal(t, http.StatusConflict, testkit.Call(t, accountsURL, signedIn, http.MethodDelete, "/users/me", nil).Status)
	require.Equal(t, http.StatusNoContent, testkit.Call(t, contestsURL, signedIn, http.MethodDelete, "/contests/"+c.ID.String(), nil).Status)

	require.Equal(t, http.StatusNoContent, testkit.Call(t, accountsURL, signedIn, http.MethodDelete, "/users/me", nil).Status)

	// the same pre-deletion token is now rejected by every service
	for name, target := range map[string]string{
		"contests": contestsURL + "/users/me/stats",
		"games":    gamesURL + "/games/upcoming",
		"accounts": accountsURL + "/users/me",
	} {
		assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, target, signedIn, http.MethodGet, "", nil).Status, name)
	}
	assert.Equal(t, http.StatusUnauthorized, watch(t, user, c.ID, "").Status, "realtime")

	require.Eventually(t, func() bool {
		var owner string
		err := rawDB.QueryRow(`SELECT owner FROM contests.contests WHERE id = $1`, c.ID).Scan(&owner)
		return err == nil && owner == "ghost"
	}, eventually, 200*time.Millisecond, "contests anonymizes the history once it consumes user.deleted")
}

func TestJourney_RemovedParticipantLosesTheLiveView(t *testing.T) {
	kicked := "kicked-" + uuid.NewString()[:6] + "@squares.test"
	signIn(t, ownerUser)
	signIn(t, kicked)
	c := createContest(t, ownerUser, "Kick "+uuid.NewString()[:6], 50)

	invite := testkit.Call(t, contestsURL, testkit.As(ownerUser), http.MethodPost, "/contests/"+c.ID.String()+"/invites",
		map[string]any{"maxSquares": 10, "role": "participant"})
	require.Equal(t, http.StatusOK, invite.Status)
	var created struct {
		Token string `json:"token"`
	}
	invite.Decode(t, &created)
	require.Equal(t, http.StatusCreated, testkit.Call(t, contestsURL, testkit.As(kicked), http.MethodPost, "/invites/"+created.Token+"/redeem", nil).Status)

	stream := watch(t, kicked, c.ID, "")
	stream.Next(t)

	require.Equal(t, http.StatusNoContent, testkit.Call(t, contestsURL, testkit.As(ownerUser), http.MethodDelete,
		"/contests/"+c.ID.String()+"/participants/"+kicked, nil).Status)

	assert.Equal(t, "revoked", nextOfKind(t, stream, "revoked").Kind)
	assert.Equal(t, http.StatusForbidden, watch(t, kicked, c.ID, "").Status)
}
