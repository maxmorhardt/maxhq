package streams

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func add(t *testing.T, client *redis.Client, name, id, eventType, data string) string {
	t.Helper()
	got, err := client.XAdd(context.Background(), &redis.XAddArgs{
		Stream: Key(name),
		ID:     id,
		Values: []string{fieldType, eventType, fieldData, data, fieldEventID, "evt-" + id},
	}).Result()
	require.NoError(t, err)
	return got
}

func TestKey(t *testing.T) {
	assert.Equal(t, "app:events:contest:1", Key("contest:1"))
}

func TestCompareIDs(t *testing.T) {
	assert.Equal(t, 0, CompareIDs("5-1", "5-1"))
	assert.Equal(t, -1, CompareIDs("5-1", "5-2"))
	assert.Equal(t, 1, CompareIDs("6-0", "5-9"))
	assert.Equal(t, 1, CompareIDs("10-0", "9-0"), "compares numerically, not as text")
	assert.Equal(t, -1, CompareIDs("bad", "1-0"))
	assert.Equal(t, 1, CompareIDs("1-0", "bad"))
	assert.Equal(t, 0, CompareIDs("bad", "worse"))
}

func TestNextID(t *testing.T) {
	next, err := NextID("5-1")
	require.NoError(t, err)
	assert.Equal(t, "5-2", next)

	next, err = NextID("5-18446744073709551615")
	require.NoError(t, err)
	assert.Equal(t, "6-0", next)

	for _, bad := range []string{"5", "x-1", "1-x"} {
		_, err = NextID(bad)
		assert.Error(t, err, bad)
	}
}

func TestValidID(t *testing.T) {
	assert.True(t, ValidID("1700000000000-0"))
	assert.False(t, ValidID("12"))
	assert.False(t, ValidID(""))
}

func TestRangeIsExclusiveOfTheGivenID(t *testing.T) {
	_, client := newRedis(t)
	add(t, client, "s", "1-0", "a", `{"n":1}`)
	add(t, client, "s", "2-0", "b", `{"n":2}`)
	add(t, client, "s", "3-0", "c", `{"n":3}`)
	ctx := context.Background()

	all, err := Range(ctx, client, "s", "", 10)
	require.NoError(t, err)
	assert.Len(t, all, 3)
	assert.Equal(t, Entry{ID: "1-0", Type: "a", Data: []byte(`{"n":1}`), EventID: "evt-1-0"}, all[0])

	after, err := Range(ctx, client, "s", "1-0", 10)
	require.NoError(t, err)
	require.Len(t, after, 2)
	assert.Equal(t, "2-0", after[0].ID)

	limited, err := Range(ctx, client, "s", "", 1)
	require.NoError(t, err)
	assert.Len(t, limited, 1)

	_, err = Range(ctx, client, "s", "nope", 10)
	assert.Error(t, err)
}

func TestBounds(t *testing.T) {
	_, client := newRedis(t)
	ctx := context.Background()

	first, last, err := Bounds(ctx, client, "s")
	require.NoError(t, err)
	assert.Empty(t, first)
	assert.Empty(t, last)

	add(t, client, "s", "4-0", "a", "{}")
	first, last, err = Bounds(ctx, client, "s")
	require.NoError(t, err)
	assert.Equal(t, "4-0", first)
	assert.Equal(t, "4-0", last)

	add(t, client, "s", "9-0", "a", "{}")
	first, last, err = Bounds(ctx, client, "s")
	require.NoError(t, err)
	assert.Equal(t, "4-0", first)
	assert.Equal(t, "9-0", last)
}

func TestReadReturnsNewEntriesPerStream(t *testing.T) {
	_, client := newRedis(t)
	add(t, client, "a", "1-0", "x", "{}")
	add(t, client, "a", "2-0", "x", "{}")
	add(t, client, "b", "5-0", "y", "{}")

	got, err := Read(context.Background(), client, map[string]string{"a": "1-0", "b": ""}, 10, 10*time.Millisecond)

	require.NoError(t, err)
	require.Len(t, got["a"], 1)
	assert.Equal(t, "2-0", got["a"][0].ID)
	require.Len(t, got["b"], 1)
	assert.Equal(t, "5-0", got["b"][0].ID)
}

func TestReadTimesOutQuietly(t *testing.T) {
	_, client := newRedis(t)
	add(t, client, "a", "1-0", "x", "{}")

	got, err := Read(context.Background(), client, map[string]string{"a": "1-0"}, 10, 20*time.Millisecond)
	require.NoError(t, err)
	assert.Empty(t, got)

	got, err = Read(context.Background(), client, nil, 10, time.Millisecond)
	require.NoError(t, err)
	assert.Nil(t, got)
}
