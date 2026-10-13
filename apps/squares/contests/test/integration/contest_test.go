package integration

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContest_FullLifecycle(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Super Bowl", 50)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	contestID := contest.ID
	assert.Equal(t, `"1"`, resp.Header.Get("ETag"))

	t.Run("owner lists their contests", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodGet, "/contests/owner/"+ownerUser+"?page=1&limit=25", nil)
		require.Equal(t, http.StatusOK, resp.Status)
		assert.Contains(t, string(resp.Body), contestID.String())
	})

	t.Run("update with the current version bumps it", func(t *testing.T) {
		away := "49ers"
		resp := call(t, testkit.As(ownerUser), http.MethodPatch, "/contests/"+contestID.String(),
			model.UpdateContestRequest{AwayTeam: &away}, "If-Match", `"1"`)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		assert.Equal(t, `"2"`, resp.Header.Get("ETag"))
	})

	t.Run("update with a stale version is rejected", func(t *testing.T) {
		home := "Bills"
		resp := call(t, testkit.As(ownerUser), http.MethodPatch, "/contests/"+contestID.String(),
			model.UpdateContestRequest{HomeTeam: &home}, "If-Match", `"1"`)
		assert.Equal(t, http.StatusPreconditionFailed, resp.Status)
	})

	var inviteToken string
	t.Run("owner creates an invite", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/invites",
			model.CreateInviteRequest{MaxSquares: 50, Role: "participant"})
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var invite model.ContestInvite
		resp.Decode(t, &invite)
		inviteToken = invite.Token
	})

	t.Run("anyone can preview the invite", func(t *testing.T) {
		resp := call(t, testkit.Anonymous, http.MethodGet, "/invites/"+inviteToken, nil)
		require.Equal(t, http.StatusOK, resp.Status)
		assert.Contains(t, string(resp.Body), "Super Bowl")
	})

	t.Run("member redeems the invite", func(t *testing.T) {
		resp := call(t, testkit.As(memberUser), http.MethodPost, "/invites/"+inviteToken+"/redeem", nil)
		assert.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
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
			claim(t, claimer, contestID, sq.ID)
		}
	})

	t.Run("a claimed square cannot be taken", func(t *testing.T) {
		sq := snapshot(t, ownerUser, contestID).Contest.Squares[0]
		other := ownerUser
		if sq.Owner == ownerUser {
			other = memberUser
		}
		resp := call(t, testkit.As(other), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.Status)
	})

	t.Run("start locks the grid", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/start", nil)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var started model.Contest
		resp.Decode(t, &started)
		assert.Equal(t, model.ContestStatusQ1, started.Status)
	})

	t.Run("squares cannot change once started", func(t *testing.T) {
		sq := snapshot(t, ownerUser, contestID).Contest.Squares[1]
		resp := call(t, testkit.As(ownerUser), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/clear", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.Status)
	})

	scores := []model.QuarterResultRequest{{HomeTeamScore: 7, AwayTeamScore: 3}, {HomeTeamScore: 14, AwayTeamScore: 10}, {HomeTeamScore: 21, AwayTeamScore: 17}, {HomeTeamScore: 28, AwayTeamScore: 24}}
	for i, score := range scores {
		t.Run(fmt.Sprintf("record Q%d", i+1), func(t *testing.T) {
			resp := call(t, testkit.As(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/quarter-result", score)
			require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
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
		resp := call(t, testkit.As(ownerUser), http.MethodDelete, "/contests/"+contestID.String(), nil)
		assert.Equal(t, http.StatusForbidden, resp.Status)
	})

	t.Run("the leaderboard counts the winners", func(t *testing.T) {
		resp := call(t, testkit.Anonymous, http.MethodGet, "/leaderboard", nil)
		require.Equal(t, http.StatusOK, resp.Status)
		assert.Contains(t, string(resp.Body), "quarterWins")
	})
}

func TestContest_IdempotentCreate(t *testing.T) {
	key := uuid.NewString()

	first, resp1 := createContest(t, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusOK, resp1.Status, string(resp1.Body))
	second, resp2 := createContest(t, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusOK, resp2.Status, string(resp2.Body))

	assert.Equal(t, first.ID, second.ID, "the retry returns the original contest")
	assert.Equal(t, "true", resp2.Header.Get("Idempotent-Replayed"))

	// without a key the duplicate name is refused, proving the replay never reached the handler
	_, resp3 := createContest(t, ownerUser, "Idempotent Bowl", 10)
	assert.Equal(t, http.StatusBadRequest, resp3.Status)
}

func TestContest_ActiveContestCanBeDeleted(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Cleanup Bowl", 4)
	require.Equal(t, http.StatusOK, resp.Status)

	assert.Equal(t, http.StatusNoContent, call(t, testkit.As(ownerUser), http.MethodDelete, "/contests/"+contest.ID.String(), nil).Status)
}

func TestContest_RequiresGatewayIdentity(t *testing.T) {
	resp := call(t, testkit.Anonymous, http.MethodPut, "/contests", model.CreateContestRequest{Owner: ownerUser, Name: "x"})
	assert.Equal(t, http.StatusUnauthorized, resp.Status)

	internal := call(t, testkit.Anonymous, http.MethodGet, "/internal/users/"+ownerUser+"/activity", nil)
	assert.Equal(t, http.StatusUnauthorized, internal.Status, "internal routes need the service token")
}
