package cache

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const revocationTTL = 30 * 24 * time.Hour

type RevocationStore interface {
	Revoke(ctx context.Context, email string, at time.Time) error
	IsRevoked(ctx context.Context, email string, issuedAt int64) (bool, error)
}

type redisRevocationStore struct {
	client *redis.Client
}

func NewRevocationStore(client *redis.Client) RevocationStore {
	return &redisRevocationStore{client: client}
}

func (s *redisRevocationStore) Revoke(ctx context.Context, email string, at time.Time) error {
	ttl := revocationTTL - time.Since(at)
	if ttl <= 0 {
		return nil
	}

	return s.client.Set(ctx, Key("revoked", email), strconv.FormatInt(at.Unix(), 10), ttl).Err()
}

func (s *redisRevocationStore) IsRevoked(ctx context.Context, email string, issuedAt int64) (bool, error) {
	raw, err := s.client.Get(ctx, Key("revoked", email)).Result()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	deletedAt, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return false, err
	}

	return issuedAt <= deletedAt, nil
}
