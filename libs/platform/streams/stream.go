// Package streams moves events between services through redis streams.
//
// Services never write to a stream directly: they add events to their postgres outbox inside the
// transaction that made the change, and a Relay appends committed events to the stream. Consumers
// track their position in postgres, so a redis restart cannot make them skip or repeat work they
// already recorded.
package streams

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/redis/go-redis/v9"
)

// field names inside every stream entry
const (
	fieldType    = "type"
	fieldData    = "data"
	fieldEventID = "event_id"
)

// one event as it sits in a stream; ID is the redis entry id ("<ms>-<seq>"), which orders entries within the stream
type Entry struct {
	ID      string
	Type    string
	Data    []byte
	EventID string
}

// Key maps a logical stream name ("games", "contest:<id>") to its redis key
func Key(name string) string {
	return cache.Key("events", name)
}

// Range returns up to count entries that come after the given id; an empty after starts at the beginning
func Range(ctx context.Context, rdb redis.Cmdable, name, after string, count int64) ([]Entry, error) {
	start := "-"
	if after != "" {
		next, err := NextID(after)
		if err != nil {
			return nil, err
		}
		start = next
	}

	msgs, err := rdb.XRangeN(ctx, Key(name), start, "+", count).Result()
	if err != nil {
		return nil, err
	}

	return toEntries(msgs), nil
}

// Bounds returns the ids of the oldest and newest entries still in the stream, or empty strings when there are none
func Bounds(ctx context.Context, rdb redis.Cmdable, name string) (first, last string, err error) {
	key := Key(name)

	head, err := rdb.XRangeN(ctx, key, "-", "+", 1).Result()
	if err != nil {
		return "", "", err
	}
	if len(head) == 0 {
		return "", "", nil
	}

	tail, err := rdb.XRevRangeN(ctx, key, "+", "-", 1).Result()
	if err != nil {
		return "", "", err
	}
	if len(tail) == 0 {
		return head[0].ID, head[0].ID, nil
	}

	return head[0].ID, tail[0].ID, nil
}

// Read blocks up to block for entries after each stream's position and returns what arrived, keyed by stream name
func Read(ctx context.Context, rdb redis.Cmdable, positions map[string]string, count int64, block time.Duration) (map[string][]Entry, error) {
	if len(positions) == 0 {
		return nil, nil
	}

	names := make([]string, 0, len(positions))
	args := make([]string, 0, 2*len(positions))
	for name := range positions {
		names = append(names, name)
		args = append(args, Key(name))
	}
	for _, name := range names {
		pos := positions[name]
		if pos == "" {
			pos = "0-0"
		}
		args = append(args, pos)
	}

	res, err := rdb.XRead(ctx, &redis.XReadArgs{Streams: args, Count: count, Block: block}).Result()
	if errors.Is(err, redis.Nil) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	byKey := make(map[string]string, len(names))
	for _, name := range names {
		byKey[Key(name)] = name
	}

	out := make(map[string][]Entry, len(res))
	for _, s := range res {
		out[byKey[s.Stream]] = toEntries(s.Messages)
	}
	return out, nil
}

// CompareIDs orders two entry ids like strings.Compare; malformed ids sort first
func CompareIDs(a, b string) int {
	ams, aseq, aerr := parseID(a)
	bms, bseq, berr := parseID(b)
	switch {
	case aerr != nil && berr != nil:
		return 0
	case aerr != nil:
		return -1
	case berr != nil:
		return 1
	case ams != bms:
		if ams < bms {
			return -1
		}
		return 1
	case aseq != bseq:
		if aseq < bseq {
			return -1
		}
		return 1
	default:
		return 0
	}
}

// ValidID reports whether s is a redis stream entry id
func ValidID(s string) bool {
	_, _, err := parseID(s)
	return err == nil
}

// NextID is the smallest id after id, which turns an inclusive range start into an exclusive one
func NextID(id string) (string, error) {
	ms, seq, err := parseID(id)
	if err != nil {
		return "", err
	}
	if seq == ^uint64(0) {
		return strconv.FormatUint(ms+1, 10) + "-0", nil
	}
	return strconv.FormatUint(ms, 10) + "-" + strconv.FormatUint(seq+1, 10), nil
}

func parseID(id string) (ms, seq uint64, err error) {
	msPart, seqPart, ok := strings.Cut(id, "-")
	if !ok {
		return 0, 0, fmt.Errorf("invalid stream id %q", id)
	}
	if ms, err = strconv.ParseUint(msPart, 10, 64); err != nil {
		return 0, 0, fmt.Errorf("invalid stream id %q", id)
	}
	if seq, err = strconv.ParseUint(seqPart, 10, 64); err != nil {
		return 0, 0, fmt.Errorf("invalid stream id %q", id)
	}
	return ms, seq, nil
}

func toEntries(msgs []redis.XMessage) []Entry {
	entries := make([]Entry, 0, len(msgs))
	for _, m := range msgs {
		entries = append(entries, Entry{
			ID:      m.ID,
			Type:    stringField(m.Values, fieldType),
			Data:    []byte(stringField(m.Values, fieldData)),
			EventID: stringField(m.Values, fieldEventID),
		})
	}
	return entries
}

func stringField(values map[string]any, field string) string {
	if v, ok := values[field].(string); ok {
		return v
	}
	return ""
}
