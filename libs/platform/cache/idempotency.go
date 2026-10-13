package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	IdempotencyInProgress = "in_progress"
	IdempotencyCompleted  = "completed"
)

// what a replay needs to answer exactly like the first request did
type IdempotencyRecord struct {
	State       string `json:"state"`
	Fingerprint string `json:"fingerprint"`
	Status      int    `json:"status,omitempty"`
	ContentType string `json:"contentType,omitempty"`
	ETag        string `json:"etag,omitempty"`
	Body        []byte `json:"body,omitempty"`
}

type IdempotencyStore interface {
	// reserved is false when the key already exists; existing then holds what is stored there
	Reserve(ctx context.Context, k, fingerprint string, ttl time.Duration) (existing *IdempotencyRecord, reserved bool, err error)
	Complete(ctx context.Context, k string, record *IdempotencyRecord, ttl time.Duration) error
	Release(ctx context.Context, k string) error
}

type redisIdempotencyStore struct {
	client *redis.Client
}

func NewIdempotencyStore(client *redis.Client) IdempotencyStore {
	return &redisIdempotencyStore{client: client}
}

func (s *redisIdempotencyStore) Reserve(ctx context.Context, k, fingerprint string, ttl time.Duration) (*IdempotencyRecord, bool, error) {
	placeholder, err := json.Marshal(IdempotencyRecord{State: IdempotencyInProgress, Fingerprint: fingerprint})
	if err != nil {
		return nil, false, err
	}

	// SET NX makes the reservation atomic across replicas
	reserved, err := s.client.SetNX(ctx, Key("idempotency", k), placeholder, ttl).Result()
	if err != nil {
		return nil, false, err
	}
	if reserved {
		return nil, true, nil
	}

	raw, err := s.client.Get(ctx, Key("idempotency", k)).Bytes()
	if errors.Is(err, redis.Nil) {
		// expired between the two calls, so the caller may simply retry
		return &IdempotencyRecord{State: IdempotencyInProgress, Fingerprint: fingerprint}, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	var existing IdempotencyRecord
	if err := json.Unmarshal(raw, &existing); err != nil {
		return nil, false, err
	}

	return &existing, false, nil
}

func (s *redisIdempotencyStore) Complete(ctx context.Context, k string, record *IdempotencyRecord, ttl time.Duration) error {
	stored := *record
	stored.State = IdempotencyCompleted
	raw, err := json.Marshal(stored)
	if err != nil {
		return err
	}

	return s.client.Set(ctx, Key("idempotency", k), raw, ttl).Err()
}

func (s *redisIdempotencyStore) Release(ctx context.Context, k string) error {
	return s.client.Del(ctx, Key("idempotency", k)).Err()
}
