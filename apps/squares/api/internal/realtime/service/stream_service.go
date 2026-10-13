package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/cache"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/clients"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"github.com/nats-io/nats.go/jetstream"
)

const eventBuffer = 64

// one contest event as it sits in the stream; Seq becomes the sse id the client resumes from
type Event struct {
	Seq   uint64
	Data  []byte
	Event model.ContestEvent
}

type Subscription struct {
	// set when the client could not resume, so it must replace its state before applying Events
	Snapshot    *model.ContestSnapshot
	SnapshotSeq uint64
	Events      <-chan Event
	Stop        func()
}

type StreamService interface {
	Subscribe(ctx context.Context, contestID uuid.UUID, user string, lastEventID *uint64) (*Subscription, error)
	CheckAccess(ctx context.Context, contestID uuid.UUID, user string) error
	IsRevoked(ctx context.Context, user string, issuedAt int64) (bool, error)
}

type streamService struct {
	js          jetstream.JetStream
	contests    clients.ContestAccessClient
	revocations cache.RevocationStore
}

func NewStreamService(js jetstream.JetStream, contests clients.ContestAccessClient, revocations cache.RevocationStore) StreamService {
	return &streamService{js: js, contests: contests, revocations: revocations}
}

func (s *streamService) Subscribe(ctx context.Context, contestID uuid.UUID, user string, lastEventID *uint64) (*Subscription, error) {
	log := util.LoggerFromContext(ctx)

	// read the stream position before the snapshot, so anything committed after the snapshot is replayed rather than lost
	stream, err := s.js.Stream(ctx, events.StreamName)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}
	info, err := stream.Info(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}
	firstSeq, lastSeq := info.State.FirstSeq, info.State.LastSeq

	// contests is the authority on access, so the snapshot doubles as the permission check even when resuming
	snapshot, err := s.contests.GetSnapshot(ctx, contestID, user)
	if err != nil {
		return nil, err
	}

	sub := &Subscription{}
	start := lastSeq + 1
	switch {
	case lastEventID != nil && *lastEventID <= lastSeq && *lastEventID+1 >= firstSeq:
		// everything the client missed is still retained, so replay just the gap
		start = *lastEventID + 1
		metrics.RecordStreamResume(true)
	default:
		if lastEventID != nil {
			// the gap aged out of the stream (or the id is from another stream), so start over from a snapshot
			metrics.RecordStreamResume(false)
			log.Info("last event id is no longer replayable, sending a snapshot", "last_event_id", *lastEventID, "first_seq", firstSeq, "last_seq", lastSeq)
		}
		sub.Snapshot = snapshot
		sub.SnapshotSeq = lastSeq
	}

	cons, err := s.js.OrderedConsumer(ctx, events.StreamName, jetstream.OrderedConsumerConfig{
		FilterSubjects: []string{events.ContestSubject(contestID)},
		DeliverPolicy:  jetstream.DeliverByStartSequencePolicy,
		OptStartSeq:    start,
	})
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	iter, err := cons.Messages()
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}

	sub.Events = pump(ctx, iter)
	sub.Stop = iter.Stop
	return sub, nil
}

// closes the channel when the consumer stops, which the handler treats as the end of the stream
func pump(ctx context.Context, iter jetstream.MessagesContext) <-chan Event {
	out := make(chan Event, eventBuffer)
	log := util.LoggerFromContext(ctx)

	go func() {
		defer close(out)
		for {
			msg, err := iter.Next()
			if err != nil {
				if !errors.Is(err, jetstream.ErrMsgIteratorClosed) {
					log.Warn("contest event consumer stopped", "error", err)
				}
				return
			}

			md, err := msg.Metadata()
			if err != nil {
				log.Warn("skipping event without metadata", "error", err)
				continue
			}

			var event model.ContestEvent
			if err := json.Unmarshal(msg.Data(), &event); err != nil {
				log.Warn("skipping undecodable contest event", "seq", md.Sequence.Stream, "error", err)
				continue
			}

			select {
			case out <- Event{Seq: md.Sequence.Stream, Data: msg.Data(), Event: event}:
			case <-ctx.Done():
				return
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
func RequiresAccessCheck(event *model.ContestEvent, user string) bool {
	switch event.Type {
	case model.ContestUpdateType:
		return event.Contest != nil && event.Contest.Visibility == model.ContestVisibilityPrivate
	case model.ParticipantRemovedType:
		return event.Participant != nil && event.Participant.UserID == user
	default:
		return false
	}
}
