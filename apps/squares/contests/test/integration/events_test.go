package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/platform/testkit"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvents_ContestChangesAreAppendedToTheContestStream(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Stream Bowl", 100)
	require.Equal(t, http.StatusOK, resp.Status)
	square := snapshot(t, ownerUser, contest.ID).Contest.Squares[0]

	claim(t, ownerUser, contest.ID, square.ID)

	var claimed *model.ContestEvent
	require.Eventually(t, func() bool {
		entries, err := streams.Range(context.Background(), rdb, events.ContestStream(contest.ID), "", 100)
		require.NoError(t, err)
		for _, e := range entries {
			if e.Type != events.SquareUpdateType {
				continue
			}
			var event model.ContestEvent
			require.NoError(t, json.Unmarshal(e.Data, &event))
			if event.Square != nil && event.Square.ID == square.ID {
				claimed = &event
				return true
			}
		}
		return false
	}, eventually, 100*time.Millisecond, "the relay appends the outbox row to the contest's stream")

	assert.Equal(t, ownerUser, claimed.Square.Owner)
	assert.Equal(t, int64(2), claimed.Square.Version)

	var unpublished int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.outbox WHERE published_at IS NULL`).Scan(&unpublished))
	assert.Zero(t, unpublished)
}

func TestEvents_GameKickoffAutoStartsAndScoresLinkedContests(t *testing.T) {
	gameID := uuid.New()
	game := events.Game{ID: gameID, ESPNID: "it-" + gameID.String()[:8], HomeTeam: "Lions", AwayTeam: "Bears",
		GameTime: time.Now().Add(time.Hour), Status: events.GameStatusScheduled, UpdatedAt: time.Now()}
	publish(t, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: game})

	// contests only links a game it has already heard about
	var contest model.Contest
	require.Eventually(t, func() bool {
		resp := call(t, testkit.As(ownerUser), http.MethodPut, "/contests", model.CreateContestRequest{
			Owner: ownerUser, Name: "Kickoff " + game.ESPNID[3:], MaxSquares: 100, GameID: gameID.String(),
		})
		if resp.Status != http.StatusOK {
			return false
		}
		resp.Decode(t, &contest)
		return true
	}, eventually, 200*time.Millisecond)
	assert.Equal(t, "Lions", contest.HomeTeam, "teams come from the game")

	for _, sq := range snapshot(t, ownerUser, contest.ID).Contest.Squares {
		claim(t, ownerUser, contest.ID, sq.ID)
	}

	game.Status = events.GameStatusInProgress
	game.Period = 2
	game.UpdatedAt = time.Now()
	game.Scores = []events.GameScore{{ID: uuid.New(), Quarter: 1, HomeScore: 7, AwayScore: 3}}
	publish(t, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: game})

	require.Eventually(t, func() bool {
		snap := snapshot(t, ownerUser, contest.ID)
		return snap.Contest.Status == model.ContestStatusQ2 && len(snap.Contest.QuarterResults) == 1
	}, eventually, 200*time.Millisecond, "kickoff with a full grid starts the contest and scores Q1")

	var offset string
	require.NoError(t, rawDB.QueryRow(`SELECT last_id FROM contests.stream_offsets WHERE consumer = 'contests-games'`).Scan(&offset))
	assert.True(t, streams.ValidID(offset), "the consumer saves how far it read")
}

func TestEvents_UserEventsCascadeInitialsAndScrubDeletedUsers(t *testing.T) {
	user := "cascade@squares.test"
	contest, resp := createContest(t, user, "Cascade Bowl", 10)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	square := snapshot(t, user, contest.ID).Contest.Squares[0]

	claim(t, user, contest.ID, square.ID)

	publish(t, events.UsersStream, events.UserUpdatedType, events.UserUpdated{Email: user, DisplayName: "Cas", DefaultInitials: "ZZ"})
	require.Eventually(t, func() bool {
		for _, sq := range snapshot(t, user, contest.ID).Contest.Squares {
			if sq.ID == square.ID {
				return sq.Value == "ZZ"
			}
		}
		return false
	}, eventually, 200*time.Millisecond, "new initials cascade onto live squares")

	publish(t, events.UsersStream, events.UserDeletedType, events.UserDeleted{Email: user, DeletedAt: time.Now()})
	require.Eventually(t, func() bool {
		var owner string
		err := rawDB.QueryRow(`SELECT owner FROM contests.contests WHERE id = $1`, contest.ID).Scan(&owner)
		return err == nil && owner == model.GhostUser
	}, eventually, 200*time.Millisecond, "a deleted user is scrubbed from their contests")
}

func TestEvents_UndecodableEntriesDoNotBlockTheStream(t *testing.T) {
	user := "after-poison@squares.test"
	contest, resp := createContest(t, user, "Poison Bowl", 10)
	require.Equal(t, http.StatusOK, resp.Status)
	square := snapshot(t, user, contest.ID).Contest.Squares[0]
	claim(t, user, contest.ID, square.ID)

	publish(t, events.UsersStream, events.UserUpdatedType, "not an object")
	publish(t, events.UsersStream, events.UserUpdatedType, events.UserUpdated{Email: user, DefaultInitials: "PB"})

	require.Eventually(t, func() bool {
		for _, sq := range snapshot(t, user, contest.ID).Contest.Squares {
			if sq.ID == square.ID {
				return sq.Value == "PB"
			}
		}
		return false
	}, eventually, 200*time.Millisecond, "the bad entry is skipped and the next one applied")
}
