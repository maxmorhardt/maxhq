package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/contracts"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newHub(t *testing.T) (*redis.Client, *service.Hub) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	hub := service.NewHub(client)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go hub.Run(ctx)
	return client, hub
}

func publish(t *testing.T, client *redis.Client, contestID uuid.UUID, eventType string) string {
	t.Helper()
	data, err := json.Marshal(events.ContestEvent{Type: eventType, ContestID: contestID})
	require.NoError(t, err)
	id, err := client.XAdd(context.Background(), &redis.XAddArgs{
		Stream: streams.Key(events.ContestStream(contestID)),
		Values: []string{"type", eventType, "data", string(data), "event_id", uuid.NewString()},
	}).Result()
	require.NoError(t, err)
	return id
}

func allowAll(t *testing.T, contestID uuid.UUID) *mocks.ContestAccessClient {
	t.Helper()
	c := mocks.NewContestAccessClient(t)
	c.EXPECT().GetSnapshot(mock.Anything, contestID, "v@b.com").
		Return(&contracts.ContestSnapshot{Contest: json.RawMessage(`{"id":"` + contestID.String() + `"}`)}, nil).Maybe()
	return c
}

func next(t *testing.T, sub *service.Subscription) service.Event {
	t.Helper()
	select {
	case e, ok := <-sub.Events:
		require.True(t, ok, "stream closed")
		return e
	case <-time.After(5 * time.Second):
		t.Fatal("no event received")
		return service.Event{}
	}
}

func TestSubscribe_FreshStreamStartsFromASnapshot(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	publish(t, client, contestID, events.SquareUpdatedType)
	last := publish(t, client, contestID, events.SquareUpdatedType)

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	require.NotNil(t, sub.Snapshot)
	assert.Equal(t, last, sub.SnapshotID, "the snapshot already reflects everything up to here")

	publish(t, client, uuid.New(), events.SquareUpdatedType)
	live := publish(t, client, contestID, events.ContestUpdatedType)

	e := next(t, sub)
	assert.Equal(t, live, e.ID)
	assert.Equal(t, events.ContestUpdatedType, e.Envelope.Type)
}

func TestSubscribe_EmptyStreamSnapshotStartsAtZero(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Equal(t, "0-0", sub.SnapshotID)
	first := publish(t, client, contestID, events.SquareUpdatedType)
	assert.Equal(t, first, next(t, sub).ID)
}

func TestSubscribe_ResumeReplaysOnlyTheGap(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	seen := publish(t, client, contestID, events.SquareUpdatedType)
	missed1 := publish(t, client, contestID, events.SquareUpdatedType)
	missed2 := publish(t, client, contestID, events.ParticipantJoinedType)

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", seen)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Nil(t, sub.Snapshot, "nothing was lost, so no snapshot")
	assert.Equal(t, missed1, next(t, sub).ID)
	assert.Equal(t, missed2, next(t, sub).ID)

	live := publish(t, client, contestID, events.ContestUpdatedType)
	assert.Equal(t, live, next(t, sub).ID, "live events follow the replay without repeats")
}

func TestSubscribe_TrimmedOrUnknownIDFallsBackToASnapshot(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	publish(t, client, contestID, events.SquareUpdatedType)
	last := publish(t, client, contestID, events.SquareUpdatedType)
	svc := service.NewStreamService(client, hub, allowAll(t, contestID), nil)

	for _, id := range []string{"1-0", "99999999999999-0"} {
		sub, err := svc.Subscribe(context.Background(), contestID, "v@b.com", id)
		require.NoError(t, err)
		assert.NotNil(t, sub.Snapshot, id)
		assert.Equal(t, last, sub.SnapshotID, id)
		sub.Stop()
	}
}

func TestSubscribe_AccessDeniedReleasesTheListener(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	contests := mocks.NewContestAccessClient(t)
	contests.EXPECT().GetSnapshot(mock.Anything, contestID, "v@b.com").Return(nil, errs.ErrInsufficientRole)

	_, err := service.NewStreamService(client, hub, contests, nil).Subscribe(context.Background(), contestID, "v@b.com", "")

	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestSubscribe_RedisDownIsADependencyFailure(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	mr.Close()

	_, err := service.NewStreamService(client, service.NewHub(client), mocks.NewContestAccessClient(t), nil).
		Subscribe(context.Background(), uuid.New(), "v@b.com", "")

	assert.ErrorIs(t, err, errs.ErrDependencyFailed)
}

func TestSubscribe_StopEndsTheEvents(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	sub.Stop()

	select {
	case _, ok := <-sub.Events:
		assert.False(t, ok)
	case <-time.After(5 * time.Second):
		t.Fatal("events did not close")
	}
}

func TestHub_SharesOneReadAcrossViewersOfTheSameContest(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	svc := service.NewStreamService(client, hub, allowAll(t, contestID), nil)

	a, err := svc.Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(a.Stop)
	b, err := svc.Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(b.Stop)

	id := publish(t, client, contestID, events.SquareUpdatedType)

	assert.Equal(t, id, next(t, a).ID)
	assert.Equal(t, id, next(t, b).ID)
}

func TestHub_UnsubscribeTwiceIsSafe(t *testing.T) {
	_, hub := newHub(t)
	l, err := hub.Subscribe(context.Background(), "contest:x")
	require.NoError(t, err)

	hub.Unsubscribe(l)
	hub.Unsubscribe(l)

	_, ok := <-l.C
	assert.False(t, ok)
}

func TestCheckAccessAndRevocation(t *testing.T) {
	contestID := uuid.New()
	contests := mocks.NewContestAccessClient(t)
	contests.EXPECT().GetSnapshot(mock.Anything, contestID, "v@b.com").Return(nil, errs.ErrContestNotFound)
	revocations := mocks.NewRevocationStore(t)
	revocations.EXPECT().IsRevoked(mock.Anything, "v@b.com", int64(5)).Return(true, nil)

	svc := service.NewStreamService(nil, nil, contests, revocations)

	assert.ErrorIs(t, svc.CheckAccess(context.Background(), contestID, "v@b.com"), errs.ErrContestNotFound)
	revoked, err := svc.IsRevoked(context.Background(), "v@b.com", 5)
	require.NoError(t, err)
	assert.True(t, revoked)
}

func TestRequiresAccessCheck(t *testing.T) {
	tests := []struct {
		name      string
		eventType string
		data      string
		want      bool
	}{
		{"made private", events.ContestUpdatedType, `{"visibility":"private"}`, true},
		{"made public", events.ContestUpdatedType, `{"visibility":"public"}`, false},
		{"unreadable update", events.ContestUpdatedType, `"oops"`, true},
		{"viewer removed", events.ParticipantRemovedType, `{"userId":"v@b.com"}`, true},
		{"someone else removed", events.ParticipantRemovedType, `{"userId":"x@b.com"}`, false},
		{"square update", events.SquareUpdatedType, `{"visibility":"private"}`, false},
	}

	for _, tt := range tests {
		event := events.ContestEvent{Type: tt.eventType, Data: json.RawMessage(tt.data)}
		assert.Equal(t, tt.want, service.RequiresAccessCheck(&event, "v@b.com"), tt.name)
	}
}

var watched = uuid.MustParse("7d1b0b2e-5a7c-4c2f-9d63-2f1e8f3a9b10")

func publishGame(t *testing.T, client *redis.Client, home int) string {
	t.Helper()
	return publishGameFor(t, client, watched, home)
}

func publishGameFor(t *testing.T, client *redis.Client, gameID uuid.UUID, home int) string {
	t.Helper()
	data, err := json.Marshal(events.GameUpdated{Game: events.Game{ID: gameID, HomeScore: home}})
	require.NoError(t, err)
	id, err := client.XAdd(context.Background(), &redis.XAddArgs{
		Stream: streams.Key(events.GamesStream),
		Values: []string{"type", events.GameUpdatedType, "data", string(data), "event_id", uuid.NewString()},
	}).Result()
	require.NoError(t, err)
	return id
}

func TestSubscribeGame_FollowsNewUpdates(t *testing.T) {
	client, hub := newHub(t)
	publishGame(t, client, 3)

	sub, err := service.NewStreamService(client, hub, nil, nil).SubscribeGame(context.Background(), watched, "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	live := publishGame(t, client, 7)
	e := next(t, sub)
	assert.Equal(t, live, e.ID, "a fresh viewer starts from now; the scoreboard request has the rest")
	assert.Equal(t, events.GameUpdatedType, e.Envelope.Type)
	assert.Contains(t, string(e.Data), `"homeScore":7`)
}

func TestSubscribeGame_ResumeReplaysOnlyTheGap(t *testing.T) {
	client, hub := newHub(t)
	seen := publishGame(t, client, 3)
	missed := publishGame(t, client, 7)

	sub, err := service.NewStreamService(client, hub, nil, nil).SubscribeGame(context.Background(), watched, seen)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Equal(t, missed, next(t, sub).ID)
}

func TestSubscribeGame_RedisDownIsADependencyFailure(t *testing.T) {
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	hub := service.NewHub(client)
	mr.Close()

	_, err := service.NewStreamService(client, hub, nil, nil).SubscribeGame(context.Background(), watched, "")

	assert.ErrorIs(t, err, errs.ErrDependencyFailed)
}

func TestSubscribeGame_PassesOnOnlyTheWatchedGame(t *testing.T) {
	client, hub := newHub(t)

	sub, err := service.NewStreamService(client, hub, nil, nil).SubscribeGame(context.Background(), watched, "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	publishGameFor(t, client, uuid.New(), 21)
	_, err = client.XAdd(context.Background(), &redis.XAddArgs{
		Stream: streams.Key(events.GamesStream),
		Values: []string{"type", events.GameUpdatedType, "data", "not json", "event_id", uuid.NewString()},
	}).Result()
	require.NoError(t, err)
	mine := publishGame(t, client, 7)

	e := next(t, sub)
	assert.Equal(t, mine, e.ID, "other games and unreadable entries are skipped")
	assert.Contains(t, string(e.Data), `"homeScore":7`)
}
