package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/bootstrap"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/squares/contracts"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func userEvents(t *testing.T, email string) []streams.Entry {
	t.Helper()
	entries, err := streams.Range(context.Background(), rdb, events.UsersStream, "", 1000)
	require.NoError(t, err)

	var mine []streams.Entry
	for _, e := range entries {
		var probe struct {
			Email string `json:"email"`
		}
		require.NoError(t, json.Unmarshal(e.Data, &probe))
		if probe.Email == email {
			mine = append(mine, e)
		}
	}
	return mine
}

func TestAccounts_FirstSignInCreatesTheProfileAndPublishesIt(t *testing.T) {
	user := "new@squares.test"

	resp := testkit.Call(t, replicaA, testkit.As(user), http.MethodGet, "/users/me", nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var profile model.UserProfileResponse
	resp.Decode(t, &profile)
	assert.Equal(t, user, profile.Email)
	assert.NotEmpty(t, profile.DefaultInitials, "initials default from the display name")

	require.Eventually(t, func() bool { return len(userEvents(t, user)) == 1 }, eventually, 100*time.Millisecond)
	entry := userEvents(t, user)[0]
	assert.Equal(t, events.UserUpdatedType, entry.Type)

	require.Equal(t, http.StatusOK, testkit.Call(t, replicaB, testkit.As(user), http.MethodGet, "/users/me", nil).Status)
	time.Sleep(500 * time.Millisecond)
	assert.Len(t, userEvents(t, user), 1)
}

func TestAccounts_InitialsChangeIsPublished(t *testing.T) {
	user := "initials@squares.test"
	require.Equal(t, http.StatusOK, testkit.Call(t, replicaA, testkit.As(user), http.MethodGet, "/users/me", nil).Status)

	resp := testkit.Call(t, replicaA, testkit.As(user), http.MethodPatch, "/users/me", model.UpdateUserProfileRequest{DefaultInitials: "ZZ"})
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))

	require.Eventually(t, func() bool {
		evs := userEvents(t, user)
		if len(evs) == 0 {
			return false
		}
		var last events.UserUpdated
		require.NoError(t, json.Unmarshal(evs[len(evs)-1].Data, &last))
		return last.DefaultInitials == "ZZ"
	}, eventually, 100*time.Millisecond)
}

func TestAccounts_DeletionIsBlockedByActiveContestsThenRevokesTheToken(t *testing.T) {
	user := "leaving@squares.test"
	signedIn := testkit.As(user)
	require.Equal(t, http.StatusOK, testkit.Call(t, replicaA, signedIn, http.MethodGet, "/users/me", nil).Status)

	contests.setActive(user, contracts.UserActiveContest{ID: "c1", Name: "Live Bowl", Owner: user, Role: "owner"})
	assert.Equal(t, http.StatusConflict, testkit.Call(t, replicaA, signedIn, http.MethodDelete, "/users/me", nil).Status)

	contests.setActive(user)
	require.Equal(t, http.StatusNoContent, testkit.Call(t, replicaA, signedIn, http.MethodDelete, "/users/me", nil).Status)

	assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, replicaB, signedIn, http.MethodGet, "/users/me", nil).Status)

	require.Eventually(t, func() bool {
		evs := userEvents(t, user)
		return len(evs) > 0 && evs[len(evs)-1].Type == events.UserDeletedType
	}, eventually, 100*time.Millisecond, "contests learns about the deletion from the users stream")

	fresh := testkit.Identity{Email: user, IssuedAt: time.Now().Add(time.Second)}
	time.Sleep(time.Until(fresh.IssuedAt))
	assert.Equal(t, http.StatusOK, testkit.Call(t, replicaB, fresh, http.MethodGet, "/users/me", nil).Status)
}

func TestAccounts_StartupRestoresRevocationsFromTombstones(t *testing.T) {
	user := "tombstoned@squares.test"
	deletedAt := time.Now().Add(-time.Hour)
	_, err := rawDB.Exec(`INSERT INTO accounts.deleted_accounts (email, deleted_at) VALUES ($1, $2)`, user, deletedAt)
	require.NoError(t, err)
	require.NoError(t, rdb.Del(context.Background(), cache.Key("revoked", user)).Err())

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	infra, err := bootstrap.Connect(baseCfg)
	require.NoError(t, err)
	t.Cleanup(infra.Close)
	bootstrap.New(baseCfg, infra).Start(ctx)

	stale := testkit.Identity{Email: user, IssuedAt: deletedAt.Add(-time.Hour)}
	assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, replicaA, stale, http.MethodGet, "/users/me", nil).Status)
}

func TestAccounts_RequiresGatewayIdentity(t *testing.T) {
	assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, replicaA, testkit.Anonymous, http.MethodGet, "/users/me", nil).Status)
}
