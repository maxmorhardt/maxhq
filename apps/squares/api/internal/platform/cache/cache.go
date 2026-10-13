package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"github.com/redis/go-redis/v9"
)

// a shared read-through cache; every replica sees the same cached value instead of warming its own
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
	raw, err := c.client.Get(ctx, key("cache", c.namespace, k)).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	return raw, true, nil
}

func (c *redisCache) Set(ctx context.Context, k string, value []byte, ttl time.Duration) error {
	return c.client.Set(ctx, key("cache", c.namespace, k), value, ttl).Err()
}

func (c *redisCache) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}

	full := make([]string, 0, len(keys))
	for _, k := range keys {
		full = append(full, key("cache", c.namespace, k))
	}

	return c.client.Del(ctx, full...).Err()
}

// a cache outage degrades to hitting the database, never to an error
func GetOrLoad[T any](ctx context.Context, c Cache, name, k string, ttl time.Duration, load func(context.Context) (T, error)) (T, error) {
	log := util.LoggerFromContext(ctx)

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
	value, err := load(ctx)
	if err != nil {
		var zero T
		return zero, err
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
}
