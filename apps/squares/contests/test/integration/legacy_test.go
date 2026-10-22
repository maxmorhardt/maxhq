package integration

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
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
	for _, table := range []string{"contests", "squares", "quarter_results", "contest_participants", "contest_invites"} {
		assert.True(t, tableExists(t, "contests."+table), table)
		assert.False(t, tableExists(t, "public."+table), "public."+table+" is gone")
	}
	for _, table := range []string{"contests.outbox", "contests.stream_offsets", "contests.users", "contests.games", "contests.game_scores"} {
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
		if sq.Owner == legacyUser {
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
