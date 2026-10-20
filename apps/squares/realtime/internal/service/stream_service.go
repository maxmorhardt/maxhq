package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/clients"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/metrics"
	"github.com/maxmorhardt/maxhq/libs/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/squares/contracts"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/redis/go-redis/v9"
)

const (
	eventBuffer = 64
	replayBatch = 500
)

type Event struct {
	ID       string
	Data     []byte
	Envelope events.ContestEvent
}

type Subscription struct {
	Snapshot   *contracts.ContestSnapshot
	SnapshotID string
	Events     <-chan Event
	Stop       func()
}

type StreamService interface {
	Subscribe(ctx context.Context, contestID uuid.UUID, user, lastEventID string) (*Subscription, error)
	SubscribeGame(ctx context.Context, gameID uuid.UUID, lastEventID string) (*Subscription, error)
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
	sub.Events = s.pump(ctx, stream, start, listener, decodeContestEvent)
	sub.Stop = func() {
		cancel()
		s.hub.Unsubscribe(listener)
	}
	return sub, nil
}

// game scores are public, so a game's stream needs no snapshot or access check: it replays what was missed, then follows
func (s *streamService) SubscribeGame(ctx context.Context, gameID uuid.UUID, lastEventID string) (*Subscription, error) {
	listener, err := s.hub.Subscribe(ctx, events.GamesStream)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	first, last, err := streams.Bounds(ctx, s.rdb, events.GamesStream)
	if err != nil {
		s.hub.Unsubscribe(listener)
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	start := last
	if start == "" {
		start = "0-0"
	}
	if lastEventID != "" && first != "" &&
		streams.CompareIDs(lastEventID, first) >= 0 && streams.CompareIDs(lastEventID, last) <= 0 {
		start = lastEventID
	}

	ctx, cancel := context.WithCancel(ctx)
	return &Subscription{
		Events: s.pump(ctx, events.GamesStream, start, listener, decodeGameEntry(gameID)),
		Stop: func() {
			cancel()
			s.hub.Unsubscribe(listener)
		},
	}, nil
}

func decodeContestEvent(entry streams.Entry) (events.ContestEvent, error) {
	var envelope events.ContestEvent
	err := json.Unmarshal(entry.Data, &envelope)
	return envelope, err
}

// every game shares one stream, so a viewer's stream passes on only the game they watch
var errOtherGame = errors.New("an update for another game")

// game entries carry their type on the stream entry, not in an envelope
func decodeGameEntry(gameID uuid.UUID) func(streams.Entry) (events.ContestEvent, error) {
	return func(entry streams.Entry) (events.ContestEvent, error) {
		var update events.GameUpdated
		if err := json.Unmarshal(entry.Data, &update); err != nil {
			return events.ContestEvent{}, err
		}
		if update.Game.ID != gameID {
			return events.ContestEvent{}, errOtherGame
		}
		return events.ContestEvent{Type: entry.Type}, nil
	}
}

func (s *streamService) pump(ctx context.Context, stream, start string, listener *Listener, decode func(streams.Entry) (events.ContestEvent, error)) <-chan Event {
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

			envelope, err := decode(entry)
			if errors.Is(err, errOtherGame) {
				return true
			}
			if err != nil {
				log.Warn("skipping undecodable stream entry", "id", entry.ID, "error", err)
				return true
			}

			select {
			case out <- Event{ID: entry.ID, Data: entry.Data, Envelope: envelope}:
				return true
			case <-ctx.Done():
				return false
			}
		}

		for {
			entries, err := streams.Range(ctx, s.rdb, stream, sent, replayBatch)
			if err != nil {
				log.Warn("failed to replay stream entries", "error", err)
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

func RequiresAccessCheck(event *events.ContestEvent, user string) bool {
	if event.Type != events.ContestUpdatedType && event.Type != events.ParticipantRemovedType {
		return false
	}

	var fields events.AccessFields
	if err := json.Unmarshal(event.Data, &fields); err != nil {
		// an unreadable payload is checked rather than trusted
		return true
	}

	if event.Type == events.ContestUpdatedType {
		return fields.Visibility == events.ContestVisibilityPrivate
	}
	return fields.UserID == user
}
