package cache

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/redis/go-redis/v9"
)

const pingTimeout = 5 * time.Second

var keyPrefix = "app"

func SetKeyPrefix(prefix string) {
	keyPrefix = strings.TrimSuffix(prefix, ":")
}

func NewClient(cfg config.RedisConfig) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse REDIS_URL: %w", err)
	}
	return redis.NewClient(opts), nil
}

func Ping(client *redis.Client) error {
	ctx, cancel := context.WithTimeout(context.Background(), pingTimeout)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to redis: %w", err)
	}
	return nil
}

func Key(parts ...string) string {
	return keyPrefix + ":" + strings.Join(parts, ":")
}
