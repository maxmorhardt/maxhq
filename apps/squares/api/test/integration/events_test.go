package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const eventually = 15 * time.Second

func TestEvents_GameKickoffAutoStartsAndScoresLinkedContests(t *testing.T) {
	ctx := context.Background()
	gameID := uuid.New()
	game := model.Game{ID: gameID, ESPNID: "it-" + gameID.String()[:8], HomeTeam: "Lions", AwayTeam: "Bears",
		GameTime: time.Now().Add(time.Hour), Status: model.GameStatusScheduled, UpdatedAt: time.Now()}

	// the games service would publish this from its outbox; publishing it directly exercises contests' consumer
	publishGame := func(g model.Game) {
		data, err := json.Marshal(events.GameUpdated{Game: g})
		require.NoError(t, err)
		_, err = stream.Publish(ctx, events.GameSubject(g.ID), data)
		require.NoError(t, err)
	}
	publishGame(game)

	// contests only links a game it has already heard about
	var contest model.Contest
	require.Eventually(t, func() bool {
		resp := call(t, contestsURL, as(ownerUser), http.MethodPut, "/contests", model.CreateContestRequest{
			Owner: ownerUser, Name: "Kickoff " + game.ESPNID[3:], MaxSquares: 100, GameID: gameID.String(),
		})
		if resp.status != http.StatusOK {
			return false
		}
		resp.decode(t, &contest)
		return true
	}, eventually, 200*time.Millisecond)
	assert.Equal(t, "Lions", contest.HomeTeam, "teams come from the game")

	for _, sq := range snapshot(t, ownerUser, contest.ID).Contest.Squares {
		claim(t, ownerUser, contest.ID, sq.ID)
	}

	game.Status = model.GameStatusInProgress
	game.Period = 2
	game.UpdatedAt = time.Now()
	game.Scores = []model.GameScore{{ID: uuid.New(), GameID: gameID, Quarter: 1, HomeScore: 7, AwayScore: 3}}
	publishGame(game)

	require.Eventually(t, func() bool {
		snap := snapshot(t, ownerUser, contest.ID)
		return snap.Contest.Status == model.ContestStatusQ2 && len(snap.Contest.QuarterResults) == 1
	}, eventually, 200*time.Millisecond, "kickoff with a full grid starts the contest and scores Q1")
}

func TestEvents_ProfileInitialsCascadeToLiveSquares(t *testing.T) {
	user := "initials@squares.test"
	require.Equal(t, http.StatusOK, call(t, accountsURL, as(user), http.MethodGet, "/users/me", nil).status)

	contest, resp := createContest(t, user, "Initials Bowl", 10)
	require.Equal(t, http.StatusOK, resp.status, string(resp.body))
	square := snapshot(t, user, contest.ID).Contest.Squares[0]
	claim(t, user, contest.ID, square.ID)

	update := call(t, accountsURL, as(user), http.MethodPatch, "/users/me", model.UpdateUserProfileRequest{DefaultInitials: "ZZ"})
	require.Equal(t, http.StatusOK, update.status, string(update.body))

	require.Eventually(t, func() bool {
		for _, sq := range snapshot(t, user, contest.ID).Contest.Squares {
			if sq.ID == square.ID {
				return sq.Value == "ZZ"
			}
		}
		return false
	}, eventually, 200*time.Millisecond, "accounts' user.updated event reaches contests")
}

func TestEvents_AccountDeletionRevokesEverywhereAndScrubsContests(t *testing.T) {
	user := "deleted@squares.test"
	signedIn := as(user)
	require.Equal(t, http.StatusOK, call(t, accountsURL, signedIn, http.MethodGet, "/users/me", nil).status)

	// an owned live contest blocks deletion, which accounts learns by asking contests
	contest, resp := createContest(t, user, "Doomed Bowl", 10)
	require.Equal(t, http.StatusOK, resp.status)
	assert.Equal(t, http.StatusConflict, call(t, accountsURL, signedIn, http.MethodDelete, "/users/me", nil).status)
	require.Equal(t, http.StatusNoContent, call(t, contestsURL, signedIn, http.MethodDelete, "/contests/"+contest.ID.String(), nil).status)

	require.Equal(t, http.StatusNoContent, call(t, accountsURL, signedIn, http.MethodDelete, "/users/me", nil).status)

	// the same pre-deletion token is now rejected by every service
	for name, base := range map[string]string{"contests": contestsURL, "games": gamesURL, "accounts": accountsURL} {
		path := map[string]string{"contests": "/users/me/stats", "games": "/games/upcoming", "accounts": "/users/me"}[name]
		assert.Equal(t, http.StatusUnauthorized, call(t, base, signedIn, http.MethodGet, path, nil).status, name)
	}

	require.Eventually(t, func() bool {
		var owner string
		err := rawDB.QueryRow(`SELECT owner FROM contests.contests WHERE id = $1`, contest.ID).Scan(&owner)
		return err == nil && owner == model.GhostUser
	}, eventually, 200*time.Millisecond, "contests anonymizes the history once it consumes user.deleted")

	// signing in again after deletion mints a newer token, which is allowed
	fresh := identity{email: user, issuedAt: time.Now().Add(time.Second)}
	time.Sleep(time.Until(fresh.issuedAt))
	assert.Equal(t, http.StatusOK, call(t, accountsURL, fresh, http.MethodGet, "/users/me", nil).status)
}

func TestEvents_ContactIsRateLimitedAcrossReplicas(t *testing.T) {
	// every request below fails turnstile, but each still counts against the shared limit
	statuses := make([]int, 0, 11)
	for range 11 {
		resp := call(t, accountsURL, anonymous, http.MethodPost, "/contact", model.ContactRequest{
			Name: "n", Email: "a@b.com", Subject: "s", Message: "m", TurnstileToken: "t",
		})
		statuses = append(statuses, resp.status)
	}

	assert.Equal(t, http.StatusTooManyRequests, statuses[10], fmt.Sprint(statuses))
}
