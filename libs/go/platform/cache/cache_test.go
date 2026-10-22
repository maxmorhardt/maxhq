package cache

import (
	"context"
	"errors"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
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

func TestNewClient_Ping(t *testing.T) {
	mr := miniredis.RunT(t)

	client, err := NewClient(config.RedisConfig{URL: "redis://" + mr.Addr() + "/0"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })
	assert.NoError(t, Ping(client))
}

func TestNewClient_Errors(t *testing.T) {
	_, err := NewClient(config.RedisConfig{URL: "not a url"})
	assert.ErrorContains(t, err, "failed to parse REDIS_URL")

	client, err := NewClient(config.RedisConfig{URL: "redis://127.0.0.1:1/0"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = client.Close() })
	assert.ErrorContains(t, Ping(client), "failed to connect to redis")
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

func TestGetOrLoad_ConcurrentMissesShareOneLoad(t *testing.T) {
	_, client := newRedis(t)
	c := NewRedisCache(client, "test")

	var loads atomic.Int32
	release := make(chan struct{})
	load := func(ctx context.Context) (payload, error) {
		loads.Add(1)
		<-release
		return payload{N: 3}, ctx.Err()
	}

	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			got, err := GetOrLoad(context.Background(), c, "test", "shared", time.Minute, load)
			assert.NoError(t, err)
			assert.Equal(t, 3, got.N)
		}()
	}
	time.Sleep(50 * time.Millisecond)
	close(release)
	wg.Wait()

	assert.Equal(t, int32(1), loads.Load())
}

func TestGetOrLoad_WaiterStopsOnItsOwnCancellation(t *testing.T) {
	_, client := newRedis(t)
	c := NewRedisCache(client, "test")

	release := make(chan struct{})
	defer close(release)
	load := func(ctx context.Context) (payload, error) {
		<-release
		return payload{N: 1}, ctx.Err()
	}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		_, err := GetOrLoad(ctx, c, "test", "waiting", time.Minute, load)
		done <- err
	}()
	time.Sleep(20 * time.Millisecond)
	cancel()

	select {
	case err := <-done:
		assert.ErrorIs(t, err, context.Canceled)
	case <-time.After(time.Second):
		t.Fatal("waiter stayed blocked on the shared load")
	}
}

func TestGetOrLoad_CachesAfterTheInitiatingCallerDisconnects(t *testing.T) {
	_, client := newRedis(t)
	c := NewRedisCache(client, "test")

	release := make(chan struct{})
	load := func(ctx context.Context) (payload, error) {
		<-release
		return payload{N: 9}, ctx.Err()
	}

	first, cancel := context.WithCancel(context.Background())
	firstDone := make(chan error, 1)
	go func() {
		_, err := GetOrLoad(first, c, "test", "outlives", time.Minute, load)
		firstDone <- err
	}()
	time.Sleep(20 * time.Millisecond)

	secondDone := make(chan payload, 1)
	go func() {
		got, err := GetOrLoad(context.Background(), c, "test", "outlives", time.Minute, load)
		assert.NoError(t, err)
		secondDone <- got
	}()
	time.Sleep(20 * time.Millisecond)

	cancel()
	assert.ErrorIs(t, <-firstDone, context.Canceled)
	close(release)
	assert.Equal(t, 9, (<-secondDone).N)

	raw, ok, err := c.Get(context.Background(), "outlives")
	require.NoError(t, err)
	require.True(t, ok)
	assert.JSONEq(t, `{"n":9}`, string(raw))
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
