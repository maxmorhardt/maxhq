package integration

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContest_FullLifecycle(t *testing.T) {
	game := seedGame(t)
	contest, resp := createContestFor(t, &game, ownerUser, "Super Bowl", 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	contestID := contest.ID

	t.Run("owner lists their contests", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodGet, "/contests", nil)
		require.Equal(t, http.StatusOK, resp.Status)
		assert.Contains(t, string(resp.Body), contestID.String())
	})

	t.Run("contests cannot be edited after creation", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodPatch, "/contests/"+contestID.String(), map[string]string{"visibility": "public"})
		assert.Equal(t, http.StatusNotFound, resp.Status)
	})

	var inviteToken string
	t.Run("owner creates an invite", func(t *testing.T) {
		resp := call(t, testkit.As(ownerUser), http.MethodPost, "/contests/"+contestID.String()+"/invites",
			model.CreateInviteRequest{MaxSquares: 50, Role: "participant"})
		require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
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
		require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))

		// a first-time player has a name in the players list before claiming or opening their profile
		for _, p := range snapshot(t, ownerUser, contestID).Participants {
			if p.UserID == memberUser {
				assert.Equal(t, "Test "+memberUser, p.DisplayName)
			}
		}
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
		resp := call(t, testkit.As(other), http.MethodPut, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.Status)
	})

	t.Run("a full board is locked before kickoff", func(t *testing.T) {
		snap := snapshot(t, memberUser, contestID)
		assert.Equal(t, model.ContestStatusActive, snap.Contest.Status)
		var mine model.Square
		for _, sq := range snap.Contest.Squares {
			if sq.Owner == memberUser {
				mine = sq
				break
			}
		}
		require.NotNil(t, mine.ClaimedAt, "a claim records when it was made")

		resp := call(t, testkit.As(memberUser), http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, mine.ID), nil)
		assert.Equal(t, http.StatusConflict, resp.Status, string(resp.Body))
		resp = call(t, testkit.As(memberUser), http.MethodDelete, fmt.Sprintf("/contests/%s/squares/claims", contestID), nil)
		assert.Equal(t, http.StatusConflict, resp.Status, string(resp.Body))
	})

	t.Run("kickoff locks the grid", func(t *testing.T) {
		game.Status = events.GameStatusInProgress
		game.Period = 1
		game.UpdatedAt = time.Now()
		publish(t, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: game})

		require.Eventually(t, func() bool {
			return snapshot(t, ownerUser, contestID).Contest.Status == model.ContestStatusQ1
		}, eventually, 200*time.Millisecond)
	})

	t.Run("squares cannot change once started", func(t *testing.T) {
		sq := snapshot(t, ownerUser, contestID).Contest.Squares[1]
		resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, sq.ID), nil)
		assert.Equal(t, http.StatusForbidden, resp.Status)
	})

	scores := []events.GameScore{
		{ID: uuid.New(), Quarter: 1, HomeScore: 7, AwayScore: 3},
		{ID: uuid.New(), Quarter: 2, HomeScore: 14, AwayScore: 10},
		{ID: uuid.New(), Quarter: 3, HomeScore: 21, AwayScore: 17},
		{ID: uuid.New(), Quarter: 4, HomeScore: 28, AwayScore: 24},
	}
	for i := range scores {
		t.Run(fmt.Sprintf("the game scores Q%d", i+1), func(t *testing.T) {
			game.Scores = scores[:i+1]
			game.Period = i + 2
			game.HomeScore, game.AwayScore = scores[i].HomeScore, scores[i].AwayScore
			if i == len(scores)-1 {
				game.Status = events.GameStatusFinal
			}
			game.UpdatedAt = time.Now()
			publish(t, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: game})

			require.Eventually(t, func() bool {
				return len(snapshot(t, ownerUser, contestID).Contest.QuarterResults) == i+1
			}, eventually, 200*time.Millisecond)
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
	game := seedGame(t)

	first, resp1 := createContestFor(t, &game, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusCreated, resp1.Status, string(resp1.Body))
	second, resp2 := createContestFor(t, &game, ownerUser, "Idempotent Bowl", 10, "Idempotency-Key", key)
	require.Equal(t, http.StatusCreated, resp2.Status, string(resp2.Body))

	assert.Equal(t, first.ID, second.ID, "the retry returns the original contest")
	assert.Equal(t, "true", resp2.Header.Get("Idempotent-Replayed"))

	_, resp3 := createContestFor(t, &game, ownerUser, "Idempotent Bowl", 10)
	assert.Equal(t, http.StatusConflict, resp3.Status, "a new create with the same name is a conflict")
}

func TestContest_ActiveContestCanBeDeleted(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Cleanup Bowl", 4)
	require.Equal(t, http.StatusCreated, resp.Status)

	assert.Equal(t, http.StatusNoContent, call(t, testkit.As(ownerUser), http.MethodDelete, "/contests/"+contest.ID.String(), nil).Status)
}

func TestContest_RequiresGatewayIdentity(t *testing.T) {
	resp := call(t, testkit.Anonymous, http.MethodPost, "/contests", model.CreateContestRequest{Owner: ownerUser, Name: "x"})
	assert.Equal(t, http.StatusUnauthorized, resp.Status)

	internal := call(t, testkit.Anonymous, http.MethodGet, "/internal/users/"+ownerUser+"/activity", nil)
	assert.Equal(t, http.StatusUnauthorized, internal.Status, "internal routes need the service token")
}
