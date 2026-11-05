package integration

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	legacyContestID = uuid.MustParse("0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001")
	legacyGameID    = uuid.MustParse("0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002")
)

const legacyUser = "legacy@squares.test"

func tableExists(t *testing.T, qualified string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, rawDB.QueryRow(`SELECT to_regclass($1) IS NOT NULL`, qualified).Scan(&exists))
	return exists
}

func TestLegacy_ContestTablesMoveIntoTheContestsSchema(t *testing.T) {
	for _, table := range []string{"contests", "squares", "quarter_results", "contest_participants"} {
		assert.True(t, tableExists(t, "contests."+table), table)
		assert.False(t, tableExists(t, "public."+table), "public."+table+" is gone")
	}
	assert.False(t, tableExists(t, "contests.contest_invites"), "one invite link per contest replaced the invites table")
	assert.False(t, tableExists(t, "public.contest_invites"))
	for _, table := range []string{"contests.outbox", "contests.stream_offsets", "contests.users", "contests.games", "contests.game_scores", "contests.contest_bans"} {
		assert.True(t, tableExists(t, table), table)
	}

	assert.True(t, tableExists(t, "public.users"))
	assert.True(t, tableExists(t, "public.games"))

	var fks int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM pg_constraint WHERE conname = 'contests_game_id_fkey'`).Scan(&fks))
	assert.Zero(t, fks, "contests no longer reaches into the games tables")
}

func TestLegacy_CopiesOfUsersAndGamesAreSeeded(t *testing.T) {
	var initials string
	require.NoError(t, rawDB.QueryRow(`SELECT default_initials FROM contests.users WHERE email = $1`, legacyUser).Scan(&initials))
	assert.Equal(t, "LG", initials)

	var games int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.games WHERE id = $1`, legacyGameID).Scan(&games))
	assert.Equal(t, 1, games)
}

func TestLegacy_ExistingContestsKeepWorking(t *testing.T) {
	var version int64
	require.NoError(t, rawDB.QueryRow(`SELECT version FROM contests.contests WHERE id = $1`, legacyContestID).Scan(&version))
	assert.Equal(t, int64(1), version, "existing rows start at version 1")

	resp := call(t, testkit.As(legacyUser), http.MethodGet, "/contests", nil)
	require.Equal(t, http.StatusOK, resp.Status)
	assert.Contains(t, string(resp.Body), "Legacy Pool")

	snap := snapshot(t, legacyUser, legacyContestID)
	require.Len(t, snap.Contest.Squares, 100)
	claimed := 0
	for _, sq := range snap.Contest.Squares {
		if sq.Owner == pseudonym.Of(legacyUser) {
			claimed++
			assert.Equal(t, "LG", sq.Value)
		}
	}
	assert.Equal(t, 1, claimed)

	for _, sq := range snap.Contest.Squares {
		if sq.Owner == "" {
			claim(t, legacyUser, legacyContestID, sq.ID)
			break
		}
	}
}

func TestLegacy_ExistingContestsGetAnInviteLinkAndViewersBecomeParticipants(t *testing.T) {
	var token string
	require.NoError(t, rawDB.QueryRow(`SELECT invite_token FROM contests.contests WHERE id = $1`, legacyContestID).Scan(&token))
	assert.Len(t, token, 64)

	var role string
	var maxSquares int
	require.NoError(t, rawDB.QueryRow(`SELECT role, max_squares FROM contests.contest_participants WHERE user_id = 'viewer@squares.test'`).Scan(&role, &maxSquares))
	assert.Equal(t, "participant", role)
	assert.Zero(t, maxSquares)
}

func TestLegacy_EmailsAreLowercased(t *testing.T) {
	var participant, owner string
	require.NoError(t, rawDB.QueryRow(`SELECT user_id FROM contests.contest_participants WHERE contest_id = $1 AND role = 'participant'`, legacyContestID).Scan(&participant))
	require.NoError(t, rawDB.QueryRow(`SELECT owner FROM contests.squares WHERE contest_id = $1 AND "row" = 0 AND col = 1`, legacyContestID).Scan(&owner))
	assert.Equal(t, "mixed@squares.test", participant)
	assert.Equal(t, "mixed@squares.test", owner)

	var twins int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.users WHERE lower(email) = 'twin@squares.test'`).Scan(&twins))
	assert.Equal(t, 2, twins, "the lowercase user row wins; its case-only twin is left unreachable, not merged")
	var twinOwner string
	require.NoError(t, rawDB.QueryRow(`SELECT owner FROM contests.squares WHERE contest_id = $1 AND "row" = 0 AND col = 2`, legacyContestID).Scan(&twinOwner))
	assert.Equal(t, "twin@squares.test", twinOwner, "the twin's squares belong to the one mailbox both casings name")

	resp := call(t, testkit.As("Mixed@Squares.Test"), http.MethodGet, "/contests", nil)
	require.Equal(t, http.StatusOK, resp.Status)
	assert.Contains(t, string(resp.Body), "Legacy Pool", "the joined contest, found whatever case the token carries")
}
