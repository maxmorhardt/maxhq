package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

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
	v, err, _ := loads.Do(name+":"+k, func() (any, error) {
		// shared by every waiter, so one caller going away must not fail the rest
		value, err := load(context.WithoutCancel(ctx))
		if err != nil {
			return nil, err
		}

		if c != nil {
			if raw, err := json.Marshal(value); err == nil {
				if err := c.Set(ctx, k, raw, ttl); err != nil {
					metrics.IncRedisError("cache_set")
					log.Warn("cache write failed", "cache", name, "error", err)
				}
			}
		}
		return value, nil
	})
	if err != nil {
		var zero T
		return zero, err
	}
	return v.(T), nil
}
