package service

import (
	"context"
	"sync"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/redis/go-redis/v9"
)

const (
	// how long one read waits for new entries; a contest that gets its first viewer joins the read within this
	hubBlock = time.Second
	hubBatch = 100
	// entries a listener may have queued before it is cut off and has to reconnect with its Last-Event-ID
	listenerBuffer = 256
	hubRetryDelay  = time.Second
)

// Hub reads every contest stream that has a viewer on this replica through one blocking read, so open
// streams cost no redis connections of their own, and fans each entry out to that contest's listeners
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

// receives every entry appended to one stream after it subscribed; C closes if the listener falls too far behind
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

// the listener sees everything appended to the stream from about now on; callers replay anything older themselves
func (h *Hub) Subscribe(ctx context.Context, stream string) (*Listener, error) {
	ch := make(chan streams.Entry, listenerBuffer)
	l := &Listener{C: ch, ch: ch, stream: stream}

	if h.attach(l, "") {
		return l, nil
	}

	// first viewer of this contest here: start reading where the stream ends now
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

// adds l to its topic, creating the topic at position when one is given; reports whether l was added
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

// reads until ctx ends; listeners only receive entries while this is running
func (h *Hub) Run(ctx context.Context) {
	log := reqctx.LoggerFromContext(ctx).With("component", "stream-hub")

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
					// a viewer this far behind reconnects and replays from its Last-Event-ID instead of stalling the rest
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
