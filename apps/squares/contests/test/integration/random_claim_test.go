package integration

import (
	"net/http"
	"sync"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func randomClaim(t *testing.T, user, contestID string, count int) testkit.Response {
	t.Helper()
	return call(t, testkit.As(user), http.MethodPost, "/contests/"+contestID+"/squares/random", model.RandomClaimRequest{Count: count})
}

func TestRandomClaim_FillsWithinLimitsWithoutOverlap(t *testing.T) {
	const owner, member = "fill-owner@squares.test", "fill-member@squares.test"

	contest, resp := createContest(t, owner, "Random Fill", 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	id := contest.ID.String()

	invite := call(t, testkit.As(owner), http.MethodPost, "/contests/"+id+"/invites",
		model.CreateInviteRequest{MaxSquares: 50, Role: "participant"})
	require.Equal(t, http.StatusCreated, invite.Status, string(invite.Body))
	var inv model.ContestInvite
	invite.Decode(t, &inv)
	require.Equal(t, http.StatusCreated, call(t, testkit.As(member), http.MethodPost, "/invites/"+inv.Token+"/redeem", nil).Status)

	t.Run("claims the requested number of empty squares", func(t *testing.T) {
		resp := randomClaim(t, owner, id, 5)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var out model.RandomClaimResponse
		resp.Decode(t, &out)
		assert.Equal(t, 5, out.Requested)
		require.Len(t, out.Squares, 5)
		for _, sq := range out.Squares {
			assert.Equal(t, owner, sq.Owner)
		}
	})

	t.Run("concurrent fills never take the same square", func(t *testing.T) {
		var wg sync.WaitGroup
		for _, user := range []string{owner, member} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for range 3 {
					assert.Equal(t, http.StatusOK, randomClaim(t, user, id, 15).Status)
				}
			}()
		}
		wg.Wait()

		owners := map[string]int{}
		for _, sq := range snapshot(t, owner, contest.ID).Contest.Squares {
			owners[sq.Owner]++
		}
		assert.Equal(t, 50, owners[owner], "capped at the owner's limit")
		assert.Equal(t, 45, owners[member], "the member took what was left")
		assert.Equal(t, 5, owners[""])
	})

	t.Run("a full allowance is rejected", func(t *testing.T) {
		assert.Equal(t, http.StatusConflict, randomClaim(t, owner, id, 1).Status)
	})

	t.Run("the last squares go, then the grid is full", func(t *testing.T) {
		resp := randomClaim(t, member, id, 10)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var out model.RandomClaimResponse
		resp.Decode(t, &out)
		assert.Len(t, out.Squares, 5)

		assert.Equal(t, http.StatusConflict, randomClaim(t, member, id, 1).Status)
	})

	t.Run("rejects a bad count", func(t *testing.T) {
		assert.Equal(t, http.StatusBadRequest, randomClaim(t, owner, id, 0).Status)
		assert.Equal(t, http.StatusBadRequest, randomClaim(t, owner, id, 101).Status)
	})
}
