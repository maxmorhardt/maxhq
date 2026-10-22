package integration

import (
	"net/http"
	"testing"

	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func tableExists(t *testing.T, qualified string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, rawDB.QueryRow(`SELECT to_regclass($1) IS NOT NULL`, qualified).Scan(&exists))
	return exists
}

func TestLegacy_GameTablesMoveIntoTheGamesSchema(t *testing.T) {
	for _, table := range []string{"games", "game_scores"} {
		assert.True(t, tableExists(t, "games."+table), table)
		assert.False(t, tableExists(t, "public."+table), "public."+table+" is gone")
	}
	assert.True(t, tableExists(t, "games.outbox"))

	assert.True(t, tableExists(t, "public.contests"))
	var fks int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM pg_constraint WHERE conname = 'contests_game_id_fkey'`).Scan(&fks))
	assert.Zero(t, fks)
}

func TestLegacy_ExistingGamesAreStillServed(t *testing.T) {
	var espnID string
	require.NoError(t, rawDB.QueryRow(`SELECT espn_id FROM games.games WHERE id = '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002'`).Scan(&espnID))
	assert.Equal(t, "legacy-401", espnID)

	resp := testkit.Call(t, gamesURL, testkit.As("fan@squares.test"), http.MethodGet, "/games/upcoming", nil)
	require.Equal(t, http.StatusOK, resp.Status)
	assert.Contains(t, string(resp.Body), "legacy-401")
}
