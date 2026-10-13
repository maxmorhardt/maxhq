package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// a fixed window counter shared by every replica, so the limit holds no matter how far the deployment scales
type RateLimiter interface {
	Allow(ctx context.Context, bucket string, limit int, window time.Duration) (bool, error)
}

type redisRateLimiter struct {
	client *redis.Client
}

func NewRateLimiter(client *redis.Client) RateLimiter {
	return &redisRateLimiter{client: client}
}

func (l *redisRateLimiter) Allow(ctx context.Context, bucket string, limit int, window time.Duration) (bool, error) {
	k := key("ratelimit", bucket)

	var incr *redis.IntCmd
	_, err := l.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		incr = pipe.Incr(ctx, k)
		// only the first hit in a window sets the expiry, so later hits cannot extend it
		pipe.ExpireNX(ctx, k, window)
		return nil
	})
	if err != nil {
		return false, err
	}

	return incr.Val() <= int64(limit), nil
}
