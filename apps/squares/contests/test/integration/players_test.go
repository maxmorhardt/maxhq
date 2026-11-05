package integration

import (
	"fmt"
	"net/http"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func joinWith(t *testing.T, user, token string) testkit.Response {
	t.Helper()
	return call(t, testkit.As(user), http.MethodPost, "/invites/"+token+"/join", nil)
}

func allot(t *testing.T, owner string, contestID uuid.UUID, maxSquares int) testkit.Response {
	t.Helper()
	return call(t, testkit.As(owner), http.MethodPost, "/contests/"+contestID.String()+"/players/allot",
		model.AllotSquaresRequest{MaxSquares: maxSquares})
}

func allocated(t *testing.T, contestID uuid.UUID) int {
	t.Helper()
	var total int
	require.NoError(t, rawDB.QueryRow(`SELECT COALESCE(SUM(max_squares), 0) FROM contests.contest_players WHERE contest_id = $1`, contestID).Scan(&total))
	return total
}

func TestPlayers_RemovalBansUntilTheOwnerUnbans(t *testing.T) {
	const owner, player = "ban-owner@squares.test", "banned@squares.test"
	contest, resp := createContest(t, owner, "Bans", 10)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	token := inviteToken(t, owner, contest.ID)
	join(t, owner, player, contest.ID, 5)

	resp = call(t, testkit.As(owner), http.MethodDelete, fmt.Sprintf("/contests/%s/players/%s", contest.ID, pseudonym.Of(player)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	resp = joinWith(t, player, token)
	assert.Equal(t, http.StatusForbidden, resp.Status, "the same link can't get them back in")

	resp = call(t, testkit.As(owner), http.MethodGet, "/contests/"+contest.ID.String()+"/bans", nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var bans []model.ContestBan
	resp.Decode(t, &bans)
	require.Len(t, bans, 1)
	assert.Equal(t, pseudonym.Of(player), bans[0].UserID)
	assert.NotContains(t, string(resp.Body), "@")

	resp = call(t, testkit.As(player), http.MethodGet, "/contests/"+contest.ID.String()+"/bans", nil)
	assert.Equal(t, http.StatusForbidden, resp.Status, "only the owner sees who is banned")

	resp = call(t, testkit.As(owner), http.MethodDelete, fmt.Sprintf("/contests/%s/bans/%s", contest.ID, pseudonym.Of(player)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	resp = joinWith(t, player, token)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	var rejoined model.ContestPlayer
	resp.Decode(t, &rejoined)
	assert.Zero(t, rejoined.MaxSquares, "a rejoin starts from nothing again")
}

func TestPlayers_LeavingNeverBans(t *testing.T) {
	const owner, player = "leave-owner@squares.test", "leaver@squares.test"
	contest, resp := createContest(t, owner, "Leaving", 10)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	join(t, owner, player, contest.ID, 5)

	resp = call(t, testkit.As(player), http.MethodDelete, fmt.Sprintf("/contests/%s/players/%s", contest.ID, pseudonym.Of(player)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	resp = joinWith(t, player, inviteToken(t, owner, contest.ID))
	assert.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
}

func TestPlayers_LoweringALimitFreesTheirSquaresAtRandom(t *testing.T) {
	const owner, player = "trim-owner@squares.test", "trimmed@squares.test"
	contest, resp := createContest(t, owner, "Trim", 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	join(t, owner, player, contest.ID, 10)
	require.Equal(t, http.StatusOK, randomClaim(t, player, contest.ID.String(), 10).Status)

	resp = setSquares(t, owner, player, contest.ID, 4)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))

	var held, open int
	for _, sq := range snapshot(t, owner, contest.ID).Contest.Squares {
		switch sq.Owner {
		case pseudonym.Of(player):
			held++
		case "":
			open++
		}
	}
	assert.Equal(t, 4, held)
	assert.Equal(t, 96, open, "the six freed squares go back on the board")
}

func TestPlayers_AllotGivesEveryoneWithoutSquaresTheSameNumber(t *testing.T) {
	const owner = "allot-owner@squares.test"
	contest, resp := createContest(t, owner, "Allot", 70)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	token := inviteToken(t, owner, contest.ID)
	for _, user := range []string{"allot-a@squares.test", "allot-b@squares.test", "allot-c@squares.test"} {
		require.Equal(t, http.StatusCreated, joinWith(t, user, token).Status)
	}

	resp = allot(t, owner, contest.ID, 11)
	assert.Equal(t, http.StatusBadRequest, resp.Status, "33 more would pass 100, so nobody gets any")
	assert.Equal(t, 70, allocated(t, contest.ID))

	resp = allot(t, owner, contest.ID, 10)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var allotted []model.ContestPlayer
	resp.Decode(t, &allotted)
	assert.Len(t, allotted, 3)
	assert.Equal(t, 100, allocated(t, contest.ID))

	require.Equal(t, http.StatusCreated, joinWith(t, "allot-d@squares.test", token).Status, "joining never needs squares to be left")
	assert.Equal(t, http.StatusBadRequest, allot(t, owner, contest.ID, 1).Status)
}

func TestPlayers_ConcurrentRaisesNeverOversellTheBoard(t *testing.T) {
	const owner = "race-owner@squares.test"
	contest, resp := createContest(t, owner, "Race", 0)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	token := inviteToken(t, owner, contest.ID)

	users := make([]string, 0, 15)
	for i := range 15 {
		user := fmt.Sprintf("race-%d@squares.test", i)
		require.Equal(t, http.StatusCreated, joinWith(t, user, token).Status)
		users = append(users, user)
	}

	var wg sync.WaitGroup
	statuses := make([]int, len(users))
	for i, user := range users {
		wg.Add(1)
		go func() {
			defer wg.Done()
			statuses[i] = setSquares(t, owner, user, contest.ID, 10).Status
		}()
	}
	wg.Wait()

	var granted int
	for _, status := range statuses {
		if status == http.StatusOK {
			granted++
		}
	}
	assert.Equal(t, 10, granted)
	assert.Equal(t, 100, allocated(t, contest.ID))
}

func TestInvite_ResetKillsTheOldLink(t *testing.T) {
	const owner = "reset-owner@squares.test"
	contest, resp := createContest(t, owner, "Reset", 10)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	old := inviteToken(t, owner, contest.ID)

	resp = call(t, testkit.As(owner), http.MethodPost, "/contests/"+contest.ID.String()+"/invite/reset", nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var fresh model.InviteLinkResponse
	resp.Decode(t, &fresh)
	require.NotEqual(t, old, fresh.Token)
	assert.Equal(t, fresh.Token, inviteToken(t, owner, contest.ID))

	assert.Equal(t, http.StatusNotFound, call(t, testkit.Anonymous, http.MethodGet, "/invites/"+old, nil).Status)
	assert.Equal(t, http.StatusNotFound, joinWith(t, "late@squares.test", old).Status)
	assert.Equal(t, http.StatusCreated, joinWith(t, "late@squares.test", fresh.Token).Status)
}
