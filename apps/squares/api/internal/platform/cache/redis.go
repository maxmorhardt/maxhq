package cache

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/redis/go-redis/v9"
)

// every key this app writes starts here, so the instance can be shared with other apps
const keyPrefix = "squares:"

const pingTimeout = 5 * time.Second

func InitRedis(cfg model.RedisConfig) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse REDIS_URL: %w", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	slog.Info("redis connection established", "addr", opts.Addr, "db", opts.DB)
	return client, nil
}

func key(parts ...string) string {
	k := keyPrefix
	for i, p := range parts {
		if i > 0 {
			k += ":"
		}
		k += p
	}
	return k
}
