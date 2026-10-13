package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/redis/go-redis/v9"
)

const (
	eventBuffer = 64
	replayBatch = 500
)

type Event struct {
	ID     string
	Data   []byte
	Header events.ContestEventHeader
}

type Subscription struct {
	Snapshot   *contracts.ContestSnapshot
	SnapshotID string
	Events     <-chan Event
	Stop       func()
}

type StreamService interface {
	Subscribe(ctx context.Context, contestID uuid.UUID, user, lastEventID string) (*Subscription, error)
	CheckAccess(ctx context.Context, contestID uuid.UUID, user string) error
	IsRevoked(ctx context.Context, user string, issuedAt int64) (bool, error)
}

type streamService struct {
	rdb         redis.Cmdable
	hub         *Hub
	contests    clients.ContestAccessClient
	revocations cache.RevocationStore
}

func NewStreamService(rdb redis.Cmdable, hub *Hub, contests clients.ContestAccessClient, revocations cache.RevocationStore) StreamService {
	return &streamService{rdb: rdb, hub: hub, contests: contests, revocations: revocations}
}

func (s *streamService) Subscribe(ctx context.Context, contestID uuid.UUID, user, lastEventID string) (*Subscription, error) {
	log := logging.FromContext(ctx)
	stream := events.ContestStream(contestID)

	// listen before reading the stream bounds, so anything appended from here on is either replayed or delivered live
	listener, err := s.hub.Subscribe(ctx, stream)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	first, last, err := streams.Bounds(ctx, s.rdb, stream)
	if err != nil {
		s.hub.Unsubscribe(listener)
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	// contests is the authority on access, so the snapshot doubles as the permission check even when resuming
	snapshot, err := s.contests.GetSnapshot(ctx, contestID, user)
	if err != nil {
		s.hub.Unsubscribe(listener)
		return nil, err
	}

	sub := &Subscription{}
	start := last
	if start == "" {
		start = "0-0"
	}

	switch {
	case lastEventID != "" && first != "" &&
		streams.CompareIDs(lastEventID, first) >= 0 && streams.CompareIDs(lastEventID, last) <= 0:
		start = lastEventID
		metrics.RecordStreamResume(true)
	default:
		if lastEventID != "" {
			// the gap was trimmed (or the id is from before a redis restart), so start over from a snapshot
			metrics.RecordStreamResume(false)
			log.Info("last event id is no longer replayable, sending a snapshot", "last_event_id", lastEventID, "first", first, "last", last)
		}
		sub.Snapshot = snapshot
		sub.SnapshotID = start
	}

	ctx, cancel := context.WithCancel(ctx)
	sub.Events = s.pump(ctx, stream, start, listener)
	sub.Stop = func() {
		cancel()
		s.hub.Unsubscribe(listener)
	}
	return sub, nil
}

func (s *streamService) pump(ctx context.Context, stream, start string, listener *Listener) <-chan Event {
	out := make(chan Event, eventBuffer)
	log := logging.FromContext(ctx)

	go func() {
		defer close(out)
		sent := start

		send := func(entry streams.Entry) bool {
			if streams.CompareIDs(entry.ID, sent) <= 0 {
				return true
			}
			sent = entry.ID

			var header events.ContestEventHeader
			if err := json.Unmarshal(entry.Data, &header); err != nil {
				log.Warn("skipping undecodable contest event", "id", entry.ID, "error", err)
				return true
			}

			select {
			case out <- Event{ID: entry.ID, Data: entry.Data, Header: header}:
				return true
			case <-ctx.Done():
				return false
			}
		}

		for {
			entries, err := streams.Range(ctx, s.rdb, stream, sent, replayBatch)
			if err != nil {
				log.Warn("failed to replay contest events", "error", err)
				return
			}
			for _, entry := range entries {
				if !send(entry) {
					return
				}
			}
			if len(entries) < replayBatch {
				break
			}
		}

		for {
			select {
			case <-ctx.Done():
				return
			case entry, ok := <-listener.C:
				if !ok {
					return
				}
				if !send(entry) {
					return
				}
			}
		}
	}()

	return out
}

func (s *streamService) CheckAccess(ctx context.Context, contestID uuid.UUID, user string) error {
	_, err := s.contests.GetSnapshot(ctx, contestID, user)
	return err
}

func (s *streamService) IsRevoked(ctx context.Context, user string, issuedAt int64) (bool, error) {
	return s.revocations.IsRevoked(ctx, user, issuedAt)
}

func RequiresAccessCheck(header *events.ContestEventHeader, user string) bool {
	switch header.Type {
	case events.ContestUpdateType:
		return header.Contest != nil && header.Contest.Visibility == events.ContestVisibilityPrivate
	case events.ParticipantRemovedType:
		return header.Participant != nil && header.Participant.UserID == user
	default:
		return false
	}
}
