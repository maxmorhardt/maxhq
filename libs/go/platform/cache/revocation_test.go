package cache

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRevocations_DeletionBlocksEveryTokenUntilRestored(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()
	deletedAt := time.Now().Add(-time.Minute)

	require.NoError(t, store.Revoke(ctx, "a@x.com", deletedAt))
	assert.Greater(t, mr.TTL("squares:revoked:a@x.com"), 90*24*time.Hour, "outlives any refresh token")

	before, err := store.IsRevoked(ctx, "a@x.com", deletedAt.Add(-time.Hour).Unix())
	require.NoError(t, err)
	assert.True(t, before)
	refreshed, err := store.IsRevoked(ctx, "a@x.com", time.Now().Unix())
	require.NoError(t, err)
	assert.True(t, refreshed, "a token refreshed after the deletion is still blocked")

	_, err = store.Restore(ctx, "a@x.com", deletedAt.Unix())
	assert.ErrorIs(t, err, ErrRestoreTooOld, "a token from before the deletion cannot restore it")

	restored, err := store.Restore(ctx, "a@x.com", time.Now().Unix())
	require.NoError(t, err)
	assert.True(t, restored)
	after, err := store.IsRevoked(ctx, "a@x.com", time.Now().Unix())
	require.NoError(t, err)
	assert.False(t, after)

	again, err := store.Restore(ctx, "a@x.com", time.Now().Unix())
	require.NoError(t, err)
	assert.False(t, again, "nothing left to restore")
}

func TestRevocations_SignOutBlocksOnlyThatToken(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()
	issued := time.Now().Add(-time.Minute).Unix()
	expires := time.Now().Add(time.Hour).Unix()

	require.NoError(t, store.RevokeSession(ctx, "a@x.com", issued, expires))

	signedOut, err := store.IsRevoked(ctx, "a@x.com", issued)
	require.NoError(t, err)
	assert.True(t, signedOut)
	session, err := store.IsSessionRevoked(ctx, "a@x.com", issued)
	require.NoError(t, err)
	assert.True(t, session)

	other, err := store.IsRevoked(ctx, "a@x.com", issued+1)
	require.NoError(t, err)
	assert.False(t, other, "the account's other devices keep their tokens")

	mr.FastForward(2 * time.Hour)
	expired, err := store.IsSessionRevoked(ctx, "a@x.com", issued)
	require.NoError(t, err)
	assert.False(t, expired, "the entry lasts only as long as the token")
}

func TestRevocations_SkipWhatHasAlreadyExpired(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()

	require.NoError(t, store.Revoke(ctx, "a@x.com", time.Now().Add(-100*24*time.Hour)))
	require.NoError(t, store.RevokeSession(ctx, "a@x.com", 1, time.Now().Add(-time.Minute).Unix()))
	assert.Empty(t, mr.Keys())
}

func TestRevocations_RedisErrors(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()
	mr.Close()

	_, err := store.IsRevoked(ctx, "a@x.com", 1)
	assert.Error(t, err)
	_, err = store.Restore(ctx, "a@x.com", 1)
	assert.Error(t, err)
}

func TestRevocations_RestoreRejectsAGarbledEntry(t *testing.T) {
	_, client := newRedis(t)
	store := NewRevocationStore(client)
	require.NoError(t, client.Set(context.Background(), accountKey("a@x.com"), "not a time", 0).Err())

	_, err := store.Restore(context.Background(), "a@x.com", time.Now().Unix())
	assert.Error(t, err)
}
