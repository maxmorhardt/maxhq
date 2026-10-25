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

// a full board on a scheduled game, split between the owner and one player; returns the player's squares
func fullBoardWith(t *testing.T, game *events.Game, player string) (contestID uuid.UUID, theirs map[uuid.UUID]string) {
	t.Helper()
	contest, resp := createContestFor(t, game, ownerUser, "Removal "+uuid.NewString()[:8], 50)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))

	resp = call(t, testkit.As(ownerUser), http.MethodPost, "/contests/"+contest.ID.String()+"/invites",
		model.CreateInviteRequest{MaxSquares: 50, Role: "participant"})
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))
	var invite model.ContestInvite
	resp.Decode(t, &invite)
	resp = call(t, testkit.As(player), http.MethodPost, "/invites/"+invite.Token+"/redeem", nil)
	require.Equal(t, http.StatusCreated, resp.Status, string(resp.Body))

	squares := snapshot(t, ownerUser, contest.ID).Contest.Squares
	for i := range squares {
		claimer := ownerUser
		if i%2 == 0 {
			claimer = player
		}
		claim(t, claimer, contest.ID, squares[i].ID)
	}

	theirs = map[uuid.UUID]string{}
	squares = snapshot(t, ownerUser, contest.ID).Contest.Squares
	for i := range squares {
		if squares[i].Owner == player {
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
	player := "kicked-early@squares.test"
	game := seedGame(t)
	contestID, theirs := fullBoardWith(t, &game, player)

	resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/participants/%s", contestID, player), nil)
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
		if sq.Owner == ownerUser {
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

func TestRemoval_KickAfterKickoffGhostsTheirSquares(t *testing.T) {
	player := "kicked-late@squares.test"
	game := seedGame(t)
	contestID, theirs := fullBoardWith(t, &game, player)
	kickoff(t, &game, contestID)

	resp := call(t, testkit.As(ownerUser), http.MethodDelete, fmt.Sprintf("/contests/%s/participants/%s", contestID, player), nil)
	require.Equal(t, http.StatusNoContent, resp.Status, string(resp.Body))

	for _, sq := range squaresOf(t, contestID, theirs) {
		assert.Equal(t, model.GhostUser, sq.Owner, "a started board stays whole")
		assert.Equal(t, theirs[sq.ID], sq.Value)
	}
}

func TestRemoval_AccountDeletionFreesOpenBoardsAndGhostsStartedOnes(t *testing.T) {
	player := "deleted-player@squares.test"
	openGame := seedGame(t)
	openID, openSquares := fullBoardWith(t, &openGame, player)
	startedGame := seedGame(t)
	startedID, startedSquares := fullBoardWith(t, &startedGame, player)
	kickoff(t, &startedGame, startedID)

	// the accounts service blocks this while the player is in live contests; this covers the race past that check
	publish(t, events.UsersStream, events.UserDeletedType, events.UserDeleted{Email: player, DeletedAt: time.Now()})
	require.Eventually(t, func() bool {
		var users int
		err := rawDB.QueryRow(`SELECT COUNT(*) FROM contests.users WHERE email = $1`, player).Scan(&users)
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
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.squares WHERE owner = $1`, player).Scan(&leftover))
	assert.Zero(t, leftover)
}
