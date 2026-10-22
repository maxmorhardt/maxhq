package testkit

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"
)

type Event struct {
	ID   string
	Kind string
	Data json.RawMessage
}

func (e Event) Decode(t *testing.T, v any) {
	t.Helper()
	if err := json.Unmarshal(e.Data, v); err != nil {
		t.Fatalf("failed to decode %s event %q: %v", e.Kind, string(e.Data), err)
	}
}

type Stream struct {
	Status int
	events chan Event
}

func OpenStream(t *testing.T, url string, id Identity, lastEventID string) *Stream {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, http.NoBody)
	if err != nil {
		cancel()
		t.Fatal(err)
	}
	if lastEventID != "" {
		req.Header.Set("Last-Event-ID", lastEventID)
	}
	id.Apply(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		cancel()
		t.Fatal(err)
	}

	s := &Stream{Status: resp.StatusCode, events: make(chan Event, 64)}
	t.Cleanup(func() {
		cancel()
		_ = resp.Body.Close()
	})
	if resp.StatusCode != http.StatusOK {
		close(s.events)
		return s
	}

	go func() {
		defer close(s.events)
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
		var current Event
		for scanner.Scan() {
			line := scanner.Text()
			switch {
			case strings.HasPrefix(line, "id: "):
				current.ID = strings.TrimPrefix(line, "id: ")
			case strings.HasPrefix(line, "event: "):
				current.Kind = strings.TrimPrefix(line, "event: ")
			case strings.HasPrefix(line, "data: "):
				current.Data = json.RawMessage(strings.TrimPrefix(line, "data: "))
			case line == "" && current.Kind != "":
				s.events <- current
				current = Event{}
			}
		}
	}()

	return s
}

func (s *Stream) Next(t *testing.T) Event {
	t.Helper()
	select {
	case e, ok := <-s.events:
		if !ok {
			t.Fatal("stream ended early")
		}
		return e
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for an event")
		return Event{}
	}
}

func (s *Stream) Ended(timeout time.Duration) bool {
	deadline := time.After(timeout)
	for {
		select {
		case _, ok := <-s.events:
			if !ok {
				return true
			}
		case <-deadline:
			return false
		}
	}
}
