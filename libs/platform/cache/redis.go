package cache

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/redis/go-redis/v9"
)

const pingTimeout = 5 * time.Second

// every key a service writes starts with this, so one instance can be shared by several apps;
// the redis acl for each app is scoped to its prefix
var keyPrefix = "app"

// called once at startup, before any store or stream is used
func SetKeyPrefix(prefix string) {
	keyPrefix = strings.TrimSuffix(prefix, ":")
}

// connects and pings; fails if redis cannot be reached
func InitRedis(cfg config.RedisConfig) (*redis.Client, error) {
	client, err := NewClient(cfg)
	if err != nil {
		return nil, err
	}

	if err := Ping(client); err != nil {
		_ = client.Close()
		return nil, err
	}

	slog.Info("redis connection established", "addr", client.Options().Addr, "db", client.Options().DB)
	return client, nil
}

// builds a client without connecting; it connects on first use and reconnects on its own
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

// Key joins parts under the app prefix: Key("cache", "stats") is "<prefix>:cache:stats"
func Key(parts ...string) string {
	return keyPrefix + ":" + strings.Join(parts, ":")
}
