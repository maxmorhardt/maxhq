package service

import (
	"context"
	"sync"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/metrics"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/redis/go-redis/v9"
)

const (
	hubBlock       = time.Second
	hubBatch       = 100
	listenerBuffer = 256
	hubRetryDelay  = time.Second
)

type Hub struct {
	rdb    redis.Cmdable
	block  time.Duration
	mu     sync.Mutex
	topics map[string]*topic
	wake   chan struct{}
}

type topic struct {
	position  string
	listeners map[*Listener]struct{}
}

type Listener struct {
	C      <-chan streams.Entry
	ch     chan streams.Entry
	stream string
}

func NewHub(rdb redis.Cmdable) *Hub {
	return &Hub{
		rdb:    rdb,
		block:  hubBlock,
		topics: make(map[string]*topic),
		wake:   make(chan struct{}, 1),
	}
}

func (h *Hub) Subscribe(ctx context.Context, stream string) (*Listener, error) {
	ch := make(chan streams.Entry, listenerBuffer)
	l := &Listener{C: ch, ch: ch, stream: stream}

	if h.attach(l, "") {
		return l, nil
	}

	_, last, err := streams.Bounds(ctx, h.rdb, stream)
	if err != nil {
		return nil, err
	}
	if last == "" {
		last = "0-0"
	}

	h.attach(l, last)
	return l, nil
}

func (h *Hub) attach(l *Listener, position string) bool {
	h.mu.Lock()
	t, ok := h.topics[l.stream]
	if !ok {
		if position == "" {
			h.mu.Unlock()
			return false
		}
		t = &topic{position: position, listeners: make(map[*Listener]struct{})}
		h.topics[l.stream] = t
	}
	t.listeners[l] = struct{}{}
	metrics.SetContestsWatched(len(h.topics))
	h.mu.Unlock()

	select {
	case h.wake <- struct{}{}:
	default:
	}
	return true
}

func (h *Hub) Unsubscribe(l *Listener) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.drop(l)
}

// must hold h.mu
func (h *Hub) drop(l *Listener) {
	t, ok := h.topics[l.stream]
	if !ok {
		return
	}
	if _, ok := t.listeners[l]; !ok {
		return
	}

	delete(t.listeners, l)
	close(l.ch)
	if len(t.listeners) == 0 {
		delete(h.topics, l.stream)
	}
	metrics.SetContestsWatched(len(h.topics))
}

func (h *Hub) Run(ctx context.Context) {
	log := logging.FromContext(ctx).With("component", "stream-hub")

	for ctx.Err() == nil {
		positions := h.positions()
		if len(positions) == 0 {
			select {
			case <-ctx.Done():
				return
			case <-h.wake:
				continue
			}
		}

		got, err := streams.Read(ctx, h.rdb, positions, hubBatch, h.block)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			metrics.IncStreamReadError()
			log.Warn("failed to read contest streams, retrying", "error", err)
			sleep(ctx, hubRetryDelay)
			continue
		}

		h.deliver(got)
	}
}

func (h *Hub) positions() map[string]string {
	h.mu.Lock()
	defer h.mu.Unlock()

	positions := make(map[string]string, len(h.topics))
	for name, t := range h.topics {
		positions[name] = t.position
	}
	return positions
}

func (h *Hub) deliver(got map[string][]streams.Entry) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for name, entries := range got {
		t, ok := h.topics[name]
		if !ok {
			continue
		}

		for _, entry := range entries {
			if streams.CompareIDs(entry.ID, t.position) <= 0 {
				continue
			}
			t.position = entry.ID

			for l := range t.listeners {
				select {
				case l.ch <- entry:
				default:
					h.drop(l)
				}
			}
		}
	}
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}
