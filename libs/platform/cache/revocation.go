package cache

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// outlives Dex's longest refresh token (90 days), so a device that keeps refreshing never outlasts a block
const revocationTTL = 91 * 24 * time.Hour

var ErrRestoreTooOld = errors.New("token was issued before the account was deleted")

type RevocationStore interface {
	// Revoke blocks every token for the email, however fresh, until a later sign-in restores it
	Revoke(ctx context.Context, email string, at time.Time) error
	// Restore lifts a block for a token issued after it, and reports whether there was one
	Restore(ctx context.Context, email string, issuedAt int64) (bool, error)
	// RevokeSession blocks the one token issued to the email at issuedAt until it expires
	RevokeSession(ctx context.Context, email string, issuedAt, expiresAt int64) error
	IsRevoked(ctx context.Context, email string, issuedAt int64) (bool, error)
	// IsSessionRevoked checks only the token itself, for the one request that may restore a blocked account
	IsSessionRevoked(ctx context.Context, email string, issuedAt int64) (bool, error)
}

type redisRevocationStore struct {
	client *redis.Client
}

func NewRevocationStore(client *redis.Client) RevocationStore {
	return &redisRevocationStore{client: client}
}

func accountKey(email string) string {
	return Key("revoked", email)
}

func sessionKey(email string, issuedAt int64) string {
	return Key("revoked-session", email, strconv.FormatInt(issuedAt, 10))
}

func (s *redisRevocationStore) Revoke(ctx context.Context, email string, at time.Time) error {
	ttl := revocationTTL - time.Since(at)
	if ttl <= 0 {
		return nil
	}

	return s.client.Set(ctx, accountKey(email), strconv.FormatInt(at.Unix(), 10), ttl).Err()
}

func (s *redisRevocationStore) Restore(ctx context.Context, email string, issuedAt int64) (bool, error) {
	raw, err := s.client.Get(ctx, accountKey(email)).Result()
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
	if issuedAt <= deletedAt {
		return false, ErrRestoreTooOld
	}

	return true, s.client.Del(ctx, accountKey(email)).Err()
}

func (s *redisRevocationStore) RevokeSession(ctx context.Context, email string, issuedAt, expiresAt int64) error {
	ttl := time.Until(time.Unix(expiresAt, 0))
	if ttl <= 0 {
		return nil
	}

	return s.client.Set(ctx, sessionKey(email, issuedAt), "1", ttl).Err()
}

// one round trip for both the account block and the token's own revocation
func (s *redisRevocationStore) IsRevoked(ctx context.Context, email string, issuedAt int64) (bool, error) {
	values, err := s.client.MGet(ctx, accountKey(email), sessionKey(email, issuedAt)).Result()
	if err != nil {
		return false, err
	}

	for _, v := range values {
		if v != nil {
			return true, nil
		}
	}
	return false, nil
}

func (s *redisRevocationStore) IsSessionRevoked(ctx context.Context, email string, issuedAt int64) (bool, error) {
	n, err := s.client.Exists(ctx, sessionKey(email, issuedAt)).Result()
	return n > 0, err
}
