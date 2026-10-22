package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/metrics"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

const loadTimeout = 10 * time.Second

var loads singleflight.Group

type Cache interface {
	Get(ctx context.Context, key string) ([]byte, bool, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
}

type redisCache struct {
	client    *redis.Client
	namespace string
}

func NewRedisCache(client *redis.Client, namespace string) Cache {
	return &redisCache{client: client, namespace: namespace}
}

func (c *redisCache) Get(ctx context.Context, k string) (value []byte, found bool, err error) {
	raw, err := c.client.Get(ctx, Key("cache", c.namespace, k)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	return raw, true, nil
}

func (c *redisCache) Set(ctx context.Context, k string, value []byte, ttl time.Duration) error {
	return c.client.Set(ctx, Key("cache", c.namespace, k), value, ttl).Err()
}

func (c *redisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	full := make([]string, 0, len(keys))
	for _, k := range keys {
		full = append(full, Key("cache", c.namespace, k))
	}

	return c.client.Del(ctx, full...).Err()
}

func GetOrLoad[T any](ctx context.Context, c Cache, name, k string, ttl time.Duration, load func(context.Context) (T, error)) (T, error) {
	log := logging.FromContext(ctx)

	if c != nil {
		raw, ok, err := c.Get(ctx, k)
		switch {
		case err != nil:
			metrics.IncRedisError("cache_get")
			log.Warn("cache read failed, loading from source", "cache", name, "error", err)
		case ok:
			var cached T
			if err := json.Unmarshal(raw, &cached); err == nil {
				metrics.IncCacheRequest(name, true)
				return cached, nil
			}
			log.Warn("discarding undecodable cache entry", "cache", name)
		}
	}

	metrics.IncCacheRequest(name, false)
	// concurrent misses for the same key in this replica share one load
	ch := loads.DoChan(name+":"+k, func() (any, error) {
		// shared by every waiter, so it outlives the caller that started it but not loadTimeout
		loadCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), loadTimeout)
		defer cancel()

		value, err := load(loadCtx)
		if err != nil {
			return nil, err
		}

		if c != nil {
			if raw, err := json.Marshal(value); err == nil {
				if err := c.Set(loadCtx, k, raw, ttl); err != nil {
					metrics.IncRedisError("cache_set")
					log.Warn("cache write failed", "cache", name, "error", err)
				}
			}
		}
		return value, nil
	})

	var zero T
	select {
	case <-ctx.Done():
		return zero, ctx.Err()
	case res := <-ch:
		if res.Err != nil {
			return zero, res.Err
		}
		return res.Val.(T), nil
	}
}
