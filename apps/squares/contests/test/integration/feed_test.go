package integration

import (
	"fmt"
	"net/http"
	"net/url"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func feed(t *testing.T, user string, query url.Values) model.ContestFeedResponse {
	t.Helper()
	resp := call(t, testkit.As(user), http.MethodGet, "/contests?"+query.Encode(), nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var out model.ContestFeedResponse
	resp.Decode(t, &out)
	return out
}

func TestFeed_CombinesOwnedAndJoinedContests(t *testing.T) {
	const owner, member = "feed-owner@squares.test", "feed-member@squares.test"

	names := make([]string, 0, 3)
	for i := range 3 {
		name := fmt.Sprintf("Feed %d", i)
		_, resp := createContest(t, owner, name, 10)
		require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
		names = append(names, name)
	}
	joined, _ := createContest(t, owner, "Feed Joined", 10)

	invite := call(t, testkit.As(owner), http.MethodPost, "/contests/"+joined.ID.String()+"/invites",
		model.CreateInviteRequest{MaxSquares: 10, Role: "participant"})
	require.Equal(t, http.StatusCreated, invite.Status, string(invite.Body))
	var inv model.ContestInvite
	invite.Decode(t, &inv)
	require.Equal(t, http.StatusCreated, call(t, testkit.As(member), http.MethodPost, "/invites/"+inv.Token+"/redeem", nil).Status)

	t.Run("owner pages through every contest newest first", func(t *testing.T) {
		first := feed(t, owner, url.Values{"limit": {"3"}})
		require.Len(t, first.Contests, 3)
		require.NotEmpty(t, first.NextCursor)
		assert.Equal(t, "Feed Joined", first.Contests[0].Name)

		second := feed(t, owner, url.Values{"limit": {"3"}, "cursor": {first.NextCursor}})
		require.Len(t, second.Contests, 1)
		assert.Empty(t, second.NextCursor)
		assert.Equal(t, names[0], second.Contests[0].Name)

		for _, c := range append(first.Contests, second.Contests...) {
			assert.Equal(t, model.ParticipantRoleOwner, c.Role)
		}
	})

	t.Run("member sees only the contest they joined", func(t *testing.T) {
		got := feed(t, member, nil)
		require.Len(t, got.Contests, 1)
		assert.Equal(t, joined.ID, got.Contests[0].ID)
		assert.Equal(t, model.ParticipantRoleParticipant, got.Contests[0].Role)

		assert.Len(t, feed(t, member, url.Values{"role": {"joined"}}).Contests, 1)
		assert.Empty(t, feed(t, member, url.Values{"role": {"owned"}}).Contests)
		assert.Empty(t, feed(t, owner, url.Values{"role": {"joined"}}).Contests)
	})

	t.Run("claims show up in both feeds right away", func(t *testing.T) {
		assert.Zero(t, feed(t, member, nil).Contests[0].MySquares)

		squares := snapshot(t, owner, joined.ID).Contest.Squares
		claim(t, member, joined.ID, squares[0].ID)
		claim(t, member, joined.ID, squares[1].ID)

		mine := feed(t, member, nil).Contests[0]
		assert.Equal(t, 2, mine.MySquares)
		assert.Equal(t, 2, mine.ClaimedSquares)

		owned := feed(t, owner, url.Values{"search": {"joined"}})
		require.Len(t, owned.Contests, 1)
		assert.Equal(t, 2, owned.Contests[0].ClaimedSquares)
		assert.Zero(t, owned.Contests[0].MySquares)
	})

	t.Run("filters by status", func(t *testing.T) {
		assert.Len(t, feed(t, owner, url.Values{"status": {"open"}}).Contests, 4)
		assert.Empty(t, feed(t, owner, url.Values{"status": {"finished"}}).Contests)
	})

	t.Run("a deleted contest leaves the feed", func(t *testing.T) {
		resp := call(t, testkit.As(owner), http.MethodDelete, "/contests/"+joined.ID.String(), nil)
		require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

		assert.Len(t, feed(t, owner, nil).Contests, 3)
		assert.Empty(t, feed(t, member, nil).Contests)
	})
}
