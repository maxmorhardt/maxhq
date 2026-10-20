package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvents_ContestChangesAreAppendedToTheContestStream(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Stream Bowl", 100)
	require.Equal(t, http.StatusCreated, resp.Status)
	square := snapshot(t, ownerUser, contest.ID).Contest.Squares[0]

	claim(t, ownerUser, contest.ID, square.ID)

	var claimed model.Square
	require.Eventually(t, func() bool {
		entries, err := streams.Range(context.Background(), rdb, events.ContestStream(contest.ID), "", 100)
		require.NoError(t, err)
		for _, e := range entries {
			if e.Type != events.SquareUpdatedType {
				continue
			}
			var event events.ContestEvent
			require.NoError(t, json.Unmarshal(e.Data, &event))
			require.NoError(t, json.Unmarshal(event.Data, &claimed))
			if claimed.ID == square.ID {
				return true
			}
		}
		return false
	}, eventually, 100*time.Millisecond, "the relay appends the outbox row to the contest's stream")

	assert.Equal(t, ownerUser, claimed.Owner)
	assert.Equal(t, int64(2), claimed.Version)

	var unpublished int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.outbox WHERE published_at IS NULL`).Scan(&unpublished))
	assert.Zero(t, unpublished)
}

func TestEvents_GameKickoffAutoStartsAndScoresLinkedContests(t *testing.T) {
	game := seedGame(t)
	contest, resp := createContestFor(t, &game, ownerUser, "Kickoff "+game.ESPNID[3:], 100)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	assert.Equal(t, "Chiefs", contest.HomeTeam, "teams come from the game")

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

	require.Eventually(t, func() bool {
		entries, err := streams.Range(context.Background(), rdb, events.ContestStream(contest.ID), "", 500)
		require.NoError(t, err)
		for _, e := range entries {
			if e.Type == events.ContestGameUpdatedType {
				return true
			}
		}
		return false
	}, eventually, 100*time.Millisecond, "viewers of the contest get the live score")

	var offset string
	require.NoError(t, rawDB.QueryRow(`SELECT last_id FROM contests.stream_offsets WHERE consumer = 'contests-games'`).Scan(&offset))
	assert.True(t, streams.ValidID(offset), "the consumer saves how far it read")
}

func TestEvents_UserEventsCascadeInitialsAndScrubDeletedUsers(t *testing.T) {
	user := "cascade@squares.test"
	contest, resp := createContest(t, user, "Cascade Bowl", 10)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
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
	require.Equal(t, http.StatusCreated, resp.Status)
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
