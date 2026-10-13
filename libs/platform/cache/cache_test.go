package cache

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	SetKeyPrefix("squares")
	os.Exit(m.Run())
}

func newRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return mr, client
}

func TestInitRedis(t *testing.T) {
	mr := miniredis.RunT(t)

	client, err := InitRedis(config.RedisConfig{URL: "redis://" + mr.Addr() + "/0"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })
}

func TestInitRedis_Errors(t *testing.T) {
	_, err := InitRedis(config.RedisConfig{URL: "not a url"})
	assert.ErrorContains(t, err, "failed to parse REDIS_URL")

	_, err = InitRedis(config.RedisConfig{URL: "redis://127.0.0.1:1/0"})
	assert.ErrorContains(t, err, "failed to connect to redis")
}

func TestKey(t *testing.T) {
	assert.Equal(t, "squares:cache:stats:all", Key("cache", "stats", "all"))
}

func TestRedisCache_SetGetDelete(t *testing.T) {
	mr, client := newRedis(t)
	c := NewRedisCache(client, "stats")
	ctx := context.Background()

	_, ok, err := c.Get(ctx, "k")
	require.NoError(t, err)
	assert.False(t, ok)

	require.NoError(t, c.Set(ctx, "k", []byte("v"), time.Minute))
	raw, ok, err := c.Get(ctx, "k")
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, "v", string(raw))
	assert.True(t, mr.Exists("squares:cache:stats:k"))

	require.NoError(t, c.Delete(ctx))
	require.NoError(t, c.Delete(ctx, "k"))
	assert.False(t, mr.Exists("squares:cache:stats:k"))
}

func TestRedisCache_GetError(t *testing.T) {
	mr, client := newRedis(t)
	mr.Close()

	_, _, err := NewRedisCache(client, "x").Get(context.Background(), "k")
	assert.Error(t, err)
}

type payload struct {
	N int `json:"n"`
}

func TestGetOrLoad_CachesAcrossCalls(t *testing.T) {
	_, client := newRedis(t)
	c := NewRedisCache(client, "test")
	ctx := context.Background()

	loads := 0
	load := func(context.Context) (payload, error) {
		loads++
		return payload{N: 7}, nil
	}

	first, err := GetOrLoad(ctx, c, "test", "k", time.Minute, load)
	require.NoError(t, err)
	second, err := GetOrLoad(ctx, c, "test", "k", time.Minute, load)
	require.NoError(t, err)

	assert.Equal(t, 7, first.N)
	assert.Equal(t, first, second)
	assert.Equal(t, 1, loads)
}

func TestGetOrLoad_FailsOpenWhenRedisIsDown(t *testing.T) {
	mr, client := newRedis(t)
	mr.Close()

	value, err := GetOrLoad(context.Background(), NewRedisCache(client, "test"), "test", "k", time.Minute, func(context.Context) (payload, error) {
		return payload{N: 3}, nil
	})

	require.NoError(t, err)
	assert.Equal(t, 3, value.N)
}

func TestGetOrLoad_DiscardsCorruptEntries(t *testing.T) {
	mr, client := newRedis(t)
	require.NoError(t, mr.Set("squares:cache:test:k", "{not json"))

	value, err := GetOrLoad(context.Background(), NewRedisCache(client, "test"), "test", "k", time.Minute, func(context.Context) (payload, error) {
		return payload{N: 9}, nil
	})

	require.NoError(t, err)
	assert.Equal(t, 9, value.N)
}

func TestGetOrLoad_PropagatesLoadErrorsAndWorksWithoutCache(t *testing.T) {
	boom := errors.New("boom")
	_, err := GetOrLoad(context.Background(), nil, "test", "k", time.Minute, func(context.Context) (payload, error) {
		return payload{}, boom
	})
	assert.ErrorIs(t, err, boom)

	value, err := GetOrLoad(context.Background(), nil, "test", "k", time.Minute, func(context.Context) (payload, error) {
		return payload{N: 1}, nil
	})
	require.NoError(t, err)
	assert.Equal(t, 1, value.N)
}

func TestRevocationStore(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()

	revoked, err := store.IsRevoked(ctx, "a@b.c", time.Now().Unix())
	require.NoError(t, err)
	assert.False(t, revoked)

	deletedAt := time.Now()
	require.NoError(t, store.Revoke(ctx, "a@b.c", deletedAt))
	assert.Greater(t, mr.TTL("squares:revoked:a@b.c"), 29*24*time.Hour)

	revoked, err = store.IsRevoked(ctx, "a@b.c", deletedAt.Add(-time.Hour).Unix())
	require.NoError(t, err)
	assert.True(t, revoked, "tokens issued before the deletion are rejected")

	revoked, err = store.IsRevoked(ctx, "a@b.c", deletedAt.Add(time.Hour).Unix())
	require.NoError(t, err)
	assert.False(t, revoked, "a fresh login after deletion is allowed")
}

func TestRevocationStore_SkipsExpiredTombstonesAndReportsErrors(t *testing.T) {
	mr, client := newRedis(t)
	store := NewRevocationStore(client)
	ctx := context.Background()

	require.NoError(t, store.Revoke(ctx, "old@b.c", time.Now().Add(-revocationTTL-time.Hour)))
	assert.False(t, mr.Exists("squares:revoked:old@b.c"))

	require.NoError(t, mr.Set("squares:revoked:bad@b.c", "nope"))
	_, err := store.IsRevoked(ctx, "bad@b.c", 1)
	assert.Error(t, err)

	mr.Close()
	_, err = store.IsRevoked(ctx, "a@b.c", 1)
	assert.Error(t, err)
}

func TestRateLimiter(t *testing.T) {
	mr, client := newRedis(t)
	limiter := NewRateLimiter(client)
	ctx := context.Background()

	for i := range 3 {
		allowed, err := limiter.Allow(ctx, "contact:1.2.3.4", 3, time.Hour)
		require.NoError(t, err)
		assert.True(t, allowed, "request %d", i+1)
	}

	allowed, err := limiter.Allow(ctx, "contact:1.2.3.4", 3, time.Hour)
	require.NoError(t, err)
	assert.False(t, allowed)

	mr.FastForward(time.Hour + time.Second)
	allowed, err = limiter.Allow(ctx, "contact:1.2.3.4", 3, time.Hour)
	require.NoError(t, err)
	assert.True(t, allowed, "the window resets")

	mr.Close()
	_, err = limiter.Allow(ctx, "contact:1.2.3.4", 3, time.Hour)
	assert.Error(t, err)
}

func TestIdempotencyStore_ReserveCompleteReplay(t *testing.T) {
	_, client := newRedis(t)
	store := NewIdempotencyStore(client)
	ctx := context.Background()

	existing, reserved, err := store.Reserve(ctx, "k1", "fp", time.Hour)
	require.NoError(t, err)
	assert.True(t, reserved)
	assert.Nil(t, existing)

	existing, reserved, err = store.Reserve(ctx, "k1", "fp", time.Hour)
	require.NoError(t, err)
	assert.False(t, reserved)
	assert.Equal(t, IdempotencyInProgress, existing.State)

	require.NoError(t, store.Complete(ctx, "k1", &IdempotencyRecord{Fingerprint: "fp", Status: 201, Body: []byte(`{"ok":true}`)}, time.Hour))
	existing, reserved, err = store.Reserve(ctx, "k1", "fp", time.Hour)
	require.NoError(t, err)
	assert.False(t, reserved)
	assert.Equal(t, IdempotencyCompleted, existing.State)
	assert.Equal(t, 201, existing.Status)
	assert.JSONEq(t, `{"ok":true}`, string(existing.Body))

	require.NoError(t, store.Release(ctx, "k1"))
	_, reserved, err = store.Reserve(ctx, "k1", "fp", time.Hour)
	require.NoError(t, err)
	assert.True(t, reserved)
}

func TestIdempotencyStore_Errors(t *testing.T) {
	mr, client := newRedis(t)
	store := NewIdempotencyStore(client)
	ctx := context.Background()

	require.NoError(t, mr.Set("squares:idempotency:bad", "{"))
	_, _, err := store.Reserve(ctx, "bad", "fp", time.Hour)
	assert.Error(t, err)

	mr.Close()
	_, _, err = store.Reserve(ctx, "k", "fp", time.Hour)
	assert.Error(t, err)
}
