package integration

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createContest(t *testing.T, owner, name string, maxSquares int, headers ...string) (*model.Contest, response) {
	t.Helper()
	resp := call(t, contestsURL, as(owner), http.MethodPut, "/contests", model.CreateContestRequest{
		Owner:      owner,
		Name:       name,
		HomeTeam:   "Chiefs",
		AwayTeam:   "Eagles",
		MaxSquares: maxSquares,
	}, headers...)
	var contest model.Contest
	if resp.status == http.StatusOK {
		resp.decode(t, &contest)
	}
	return &contest, resp
}

// the realtime snapshot is how a client reads a whole contest
func snapshot(t *testing.T, user string, contestID uuid.UUID) *model.ContestSnapshot {
	t.Helper()
	resp := call(t, contestsURL, anonymous, http.MethodGet,
		fmt.Sprintf("/internal/contests/%s/snapshot?user=%s", contestID, user), nil,
		"X-Internal-Token", internalToken)
	require.Equal(t, http.StatusOK, resp.status, string(resp.body))
	var snap model.ContestSnapshot
	resp.decode(t, &snap)
	return &snap
}

func TestContest_FullLifecycle(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Super Bowl", 50)
	require.Equal(t, http.StatusOK, resp.status, string(resp.body))
	contestID := contest.ID
	assert.Equal(t, `"1"`, resp.header.Get("ETag"))

	t.Run("owner lists their contests", func(t *testing.T) {
		resp := call(t, contestsURL, as(ownerUser), http.MethodGet, "/contests/owner/"+ownerUser+"?page=1&limit=25", nil)
		require.Equal(t, http.StatusOK, resp.status)
		assert.Contains(t, string(resp.body), contestID.String())
	})

	t.Run("update with the current version bumps it", func(t *testing.T) {
		away := "49ers"
		resp := call(t, contestsURL, as(ownerUser), http.MethodPatch, "/contests/"+contestID.String(),
			model.UpdateContestRequest{AwayTeam: &away}, "If-Match", `"1"`)
		require.Equal(t, http.StatusOK, resp.status, string(resp.body))
		assert.Equal(t, `"2"`, resp.header.Get("ETag"))
	})

	t.Run("update with a stale version is rejected", func(t *testing.T) {
		home := "Bills"
		resp := call(t, contestsURL, as(ownerUser), http.MethodPatch, "/contests/"+contestID.String(),
			model.UpdateContestRequest{HomeTeam: &home}, "If-Match", `"1"`)
		assert.Equal(t, http.StatusPreconditionFailed, resp.status)
	})

	var inviteToken string
	t.Run("owner creates an invite", func(t *testing.T) {
		resp := call(t, contestsURL, as(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/invites",
			model.CreateInviteRequest{MaxSquares: 50, Role: "participant"})
		require.Equal(t, http.StatusOK, resp.status, string(resp.body))
		var invite model.ContestInvite
		resp.decode(t, &invite)
		inviteToken = invite.Token
	})

	t.Run("anyone can preview the invite", func(t *testing.T) {
		resp := call(t, contestsURL, anonymous, http.MethodGet, "/invites/"+inviteToken, nil)
		require.Equal(t, http.StatusOK, resp.status)
		assert.Contains(t, string(resp.body), "Super Bowl")
	})

	t.Run("member redeems the invite", func(t *testing.T) {
		resp := call(t, contestsURL, as(memberUser), http.MethodPost, "/invites/"+inviteToken+"/redeem", nil)
		assert.Equal(t, http.StatusCreated, resp.status, string(resp.body))
	})

	t.Run("member fills half the grid and the owner the rest", func(t *testing.T) {
		snap := snapshot(t, ownerUser, contestID)
		require.Len(t, snap.Contest.Squares, 100)
		require.Len(t, snap.Participants, 2)

		for i, sq := range snap.Contest.Squares {
			claimer := ownerUser
			if i%2 == 0 {
				claimer = memberUser
			}
			resp := call(t, contestsURL, as(claimer), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, sq.ID), nil)
			require.Equal(t, http.StatusOK, resp.status, "square %d: %s", i, resp.body)
		}
	})

	t.Run("a claimed square cannot be taken", func(t *testing.T) {
		sq := snapshot(t, ownerUser, contestID).Contest.Squares[0]
		owner := sq.Owner
		other := ownerUser
		if owner == ownerUser {
			other = memberUser
		}
		resp := call(t, contestsURL, as(other), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.status)
	})

	t.Run("start locks the grid", func(t *testing.T) {
		resp := call(t, contestsURL, as(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/start", nil)
		require.Equal(t, http.StatusOK, resp.status, string(resp.body))
		var started model.Contest
		resp.decode(t, &started)
		assert.Equal(t, model.ContestStatusQ1, started.Status)
	})

	t.Run("squares cannot change once started", func(t *testing.T) {
		sq := snapshot(t, ownerUser, contestID).Contest.Squares[1]
		resp := call(t, contestsURL, as(ownerUser), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/clear", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.status)
	})

	scores := []model.QuarterResultRequest{{HomeTeamScore: 7, AwayTeamScore: 3}, {HomeTeamScore: 14, AwayTeamScore: 10}, {HomeTeamScore: 21, AwayTeamScore: 17}, {HomeTeamScore: 28, AwayTeamScore: 24}}
	for i, score := range scores {
		t.Run(fmt.Sprintf("record Q%d", i+1), func(t *testing.T) {
			resp := call(t, contestsURL, as(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/quarter-result", score)
			require.Equal(t, http.StatusOK, resp.status, string(resp.body))
		})
	}

	t.Run("the contest finishes with four winners", func(t *testing.T) {
		snap := snapshot(t, ownerUser, contestID)
		assert.Equal(t, model.ContestStatusFinished, snap.Contest.Status)
		require.Len(t, snap.Contest.QuarterResults, 4)
		for _, qr := range snap.Contest.QuarterResults {
			assert.NotEmpty(t, qr.Winner, "quarter %d", qr.Quarter)
		}
	})

	t.Run("a finished contest cannot be deleted", func(t *testing.T) {
		resp := call(t, contestsURL, as(ownerUser), http.MethodDelete, "/contests/"+contestID.String(), nil)
		assert.Equal(t, http.StatusForbidden, resp.status)
	})

	t.Run("the leaderboard counts the winners", func(t *testing.T) {
		resp := call(t, contestsURL, anonymous, http.MethodGet, "/leaderboard", nil)
		require.Equal(t, http.StatusOK, resp.status)
		assert.Contains(t, string(resp.body), "quarterWins")
	})
}

func TestContest_IdempotentCreate(t *testing.T) {
	key := uuid.NewString()

	first, resp1 := createContest(t, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusOK, resp1.status, string(resp1.body))
	second, resp2 := createContest(t, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusOK, resp2.status, string(resp2.body))

	assert.Equal(t, first.ID, second.ID, "the retry returns the original contest")
	assert.Equal(t, "true", resp2.header.Get("Idempotent-Replayed"))

	// without a key the duplicate name is refused, proving the replay never reached the handler
	_, resp3 := createContest(t, ownerUser, "Idempotent Bowl", 10)
	assert.Equal(t, http.StatusBadRequest, resp3.status)
}

func TestContest_ActiveContestCanBeDeleted(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Cleanup Bowl", 4)
	require.Equal(t, http.StatusOK, resp.status)

	assert.Equal(t, http.StatusNoContent, call(t, contestsURL, as(ownerUser), http.MethodDelete, "/contests/"+contest.ID.String(), nil).status)
}

func TestContest_RequiresGatewayIdentity(t *testing.T) {
	resp := call(t, contestsURL, anonymous, http.MethodPut, "/contests", model.CreateContestRequest{Owner: ownerUser, Name: "x"})
	assert.Equal(t, http.StatusUnauthorized, resp.status)

	internal := call(t, contestsURL, anonymous, http.MethodGet, "/internal/users/"+ownerUser+"/activity", nil)
	assert.Equal(t, http.StatusUnauthorized, internal.status, "internal routes need the service token")
}
