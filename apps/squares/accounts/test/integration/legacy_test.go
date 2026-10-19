package integration

import (
	"net/http"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func tableExists(t *testing.T, qualified string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, rawDB.QueryRow(`SELECT to_regclass($1) IS NOT NULL`, qualified).Scan(&exists))
	return exists
}

func TestLegacy_AccountTablesMoveIntoTheAccountsSchema(t *testing.T) {
	for _, table := range []string{"users", "deleted_accounts", "contact_submissions"} {
		assert.True(t, tableExists(t, "accounts."+table), table)
		assert.False(t, tableExists(t, "public."+table), "public."+table+" is gone")
	}
	assert.True(t, tableExists(t, "accounts.outbox"))
}

func TestLegacy_ExistingProfilesAreKept(t *testing.T) {
	resp := testkit.Call(t, replicaA, testkit.As("legacy@squares.test"), http.MethodGet, "/users/me", nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))

	var profile model.UserProfileResponse
	resp.Decode(t, &profile)
	assert.Equal(t, "LG", profile.DefaultInitials, "the existing profile, not a new one")
}

func TestLegacy_ExistingTombstonesRevokeTokens(t *testing.T) {
	stale := testkit.Identity{Email: "gone@squares.test", IssuedAt: time.Now().Add(-2 * time.Hour)}

	assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, replicaA, stale, http.MethodGet, "/users/me", nil).Status)
}
