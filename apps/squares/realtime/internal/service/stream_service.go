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
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/maxmorhardt/maxstash/libs/squares/internalapi"
	"github.com/redis/go-redis/v9"
)

const (
	eventBuffer = 64
	replayBatch = 500
)

// one contest event as it sits in the stream; ID becomes the sse id the client resumes from
type Event struct {
	ID     string
	Data   []byte
	Header events.ContestEventHeader
}

type Subscription struct {
	// set when the client could not resume, so it must replace its state before applying Events
	Snapshot   *internalapi.ContestSnapshot
	SnapshotID string
	// closes when the subscription ends or the viewer falls too far behind
	Events <-chan Event
	Stop   func()
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
	log := reqctx.LoggerFromContext(ctx)
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
		// everything the client missed is still in the stream, so replay just the gap
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

// replays what came after start, then forwards live entries, skipping any the replay already sent
func (s *streamService) pump(ctx context.Context, stream, start string, listener *Listener) <-chan Event {
	out := make(chan Event, eventBuffer)
	log := reqctx.LoggerFromContext(ctx)

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

// nil means the user may still watch; ErrInsufficientRole or ErrContestNotFound means they may not
func (s *streamService) CheckAccess(ctx context.Context, contestID uuid.UUID, user string) error {
	_, err := s.contests.GetSnapshot(ctx, contestID, user)
	return err
}

func (s *streamService) IsRevoked(ctx context.Context, user string, issuedAt int64) (bool, error) {
	return s.revocations.IsRevoked(ctx, user, issuedAt)
}

// only these events can take away someone's view of a contest, so only they trigger a re-check
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
