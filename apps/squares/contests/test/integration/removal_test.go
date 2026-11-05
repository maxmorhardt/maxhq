package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// a full board on a scheduled game, split between the owner and one participant; returns the participant's squares
func fullBoardWith(t *testing.T, game *events.Game, participant string) (contestID uuid.UUID, theirs map[uuid.UUID]string) {
	t.Helper()
	contest, resp := createContestFor(t, game, ownerUser, "Removal "+uuid.NewString()[:8], 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))

	join(t, ownerUser, participant, contest.ID, 50)

	squares := snapshot(t, ownerUser, contest.ID).Contest.Squares
	for i := range squares {
		claimer := ownerUser
		if i%2 == 0 {
			claimer = participant
		}
		claim(t, claimer, contest.ID, squares[i].ID)
	}

	theirs = map[uuid.UUID]string{}
	squares = snapshot(t, ownerUser, contest.ID).Contest.Squares
	for i := range squares {
		if squares[i].Owner == pseudonym.Of(participant) {
			theirs[squares[i].ID] = squares[i].Value
		}
	}
	require.Len(t, theirs, 50)
	return contest.ID, theirs
}

func kickoff(t *testing.T, game *events.Game, contestIDs ...uuid.UUID) {
	t.Helper()
	game.Status = events.GameStatusInProgress
	game.Period = 1
	game.UpdatedAt = time.Now()
	publish(t, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: *game})
	for _, id := range contestIDs {
		require.Eventually(t, func() bool {
			return snapshot(t, ownerUser, id).Contest.Status == model.ContestStatusQ1
		}, eventually, 200*time.Millisecond, "a full board starts at kickoff")
	}
}

func squaresOf(t *testing.T, contestID uuid.UUID, ids map[uuid.UUID]string) []model.Square {
	t.Helper()
	found := make([]model.Square, 0, len(ids))
	squares := snapshot(t, ownerUser, contestID).Contest.Squares
	for i := range squares {
		if _, ok := ids[squares[i].ID]; ok {
			found = append(found, squares[i])
		}
	}
	require.Len(t, found, len(ids))
	return found
}

func TestRemoval_KickFromAFullBoardBeforeKickoffFreesTheirSquares(t *testing.T) {
	participant := "kicked-early@squares.test"
	game := seedGame(t)
	contestID, theirs := fullBoardWith(t, &game, participant)

	// clients name participants by pseudonym
	resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/participants/%s", contestID, pseudonym.Of(participant)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	snap := snapshot(t, ownerUser, contestID)
	assert.Equal(t, model.ContestStatusActive, snap.Contest.Status)
	for _, sq := range squaresOf(t, contestID, theirs) {
		assert.Empty(t, sq.Owner, "the square goes back to the pool")
		assert.Empty(t, sq.Value)
		assert.Nil(t, sq.ClaimedAt)
	}

	var mine model.Square
	for _, sq := range snap.Contest.Squares {
		if sq.Owner == pseudonym.Of(ownerUser) {
			mine = sq
			break
		}
	}
	resp = call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, mine.ID), nil)
	assert.Equal(t, http.StatusOK, resp.Status, "the board reopened, so claims can be cleared again: %s", resp.Body)

	for id := range theirs {
		claim(t, ownerUser, contestID, id)
		break
	}
}

func TestRemoval_KickedParticipantsListDropsTheContest(t *testing.T) {
	participant := "kicked-feed@squares.test"
	game := seedGame(t)
	contestID, _ := fullBoardWith(t, &game, participant)

	inFeed := func() bool {
		resp := call(t, testkit.As(participant), http.MethodGet, "/contests", nil)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var feed model.ContestFeedResponse
		resp.Decode(t, &feed)
		for _, c := range feed.Contests {
			if c.ID == contestID {
				return true
			}
		}
		return false
	}
	require.True(t, inFeed(), "the participant's list is now cached with the contest")

	resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/participants/%s", contestID, pseudonym.Of(participant)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	assert.False(t, inFeed(), "the kick clears the removed participant's cached list")
}

func TestRemoval_KickAfterKickoffGhostsTheirSquares(t *testing.T) {
	participant := "kicked-late@squares.test"
	game := seedGame(t)
	contestID, theirs := fullBoardWith(t, &game, participant)
	kickoff(t, &game, contestID)

	resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/participants/%s", contestID, pseudonym.Of(participant)), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	for _, sq := range squaresOf(t, contestID, theirs) {
		assert.Equal(t, model.GhostUser, sq.Owner, "a started board stays whole")
		assert.Equal(t, theirs[sq.ID], sq.Value)
	}
}

func TestRemoval_AccountDeletionFreesOpenBoardsAndGhostsStartedOnes(t *testing.T) {
	participant := "deleted-participant@squares.test"
	openGame := seedGame(t)
	openID, openSquares := fullBoardWith(t, &openGame, participant)
	startedGame := seedGame(t)
	startedID, startedSquares := fullBoardWith(t, &startedGame, participant)
	kickoff(t, &startedGame, startedID)

	// the accounts service blocks this while the participant is in live contests; this covers the race past that check
	publish(t, events.UsersStream, events.UserDeletedType, events.UserDeleted{Email: participant, DeletedAt: time.Now()})
	require.Eventually(t, func() bool {
		var users int
		err := rawDB.QueryRow(`SELECT COUNT(*) FROM contests.users WHERE email = $1`, participant).Scan(&users)
		return err == nil && users == 0
	}, eventually, 200*time.Millisecond, "the deleted user is scrubbed")

	for _, sq := range squaresOf(t, openID, openSquares) {
		assert.Empty(t, sq.Owner, "a board before kickoff gets the squares back")
		assert.Empty(t, sq.Value)
	}
	for _, sq := range squaresOf(t, startedID, startedSquares) {
		assert.Equal(t, model.GhostUser, sq.Owner, "a started board stays whole")
		assert.Equal(t, startedSquares[sq.ID], sq.Value)
		assert.Empty(t, sq.OwnerName)
	}

	var leftover int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.squares WHERE owner = $1`, participant).Scan(&leftover))
	assert.Zero(t, leftover)
}

func TestRemoval_EditedAndRemovedParticipantsKeepTheirNames(t *testing.T) {
	participant := "named@squares.test"
	game := seedGame(t)
	contest, resp := createContestFor(t, &game, ownerUser, "Names "+uuid.NewString()[:8], 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	join(t, ownerUser, participant, contest.ID, 10)

	path := fmt.Sprintf("/contests/%s/participants/%s", contest.ID, pseudonym.Of(participant))
	resp = setSquares(t, ownerUser, participant, contest.ID, 5)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var updated model.ContestParticipant
	resp.Decode(t, &updated)
	assert.Equal(t, "Test N.", updated.DisplayName, "every viewer's participant list takes this entry as is")

	resp = call(t, testkit.As(ownerUser), http.MethodDelete, path, nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	var removed model.ContestParticipant
	require.Eventually(t, func() bool {
		entries, err := streams.Range(context.Background(), rdb, events.ContestStream(contest.ID), "", 100)
		require.NoError(t, err)
		for _, e := range entries {
			if e.Type == events.ParticipantRemovedType {
				var event events.ContestEvent
				require.NoError(t, json.Unmarshal(e.Data, &event))
				require.NoError(t, json.Unmarshal(event.Data, &removed))
				return true
			}
		}
		return false
	}, eventually, 100*time.Millisecond, "the removal reaches the contest's stream")
	assert.Equal(t, "Test N.", removed.DisplayName, "the feed says who left")
}
