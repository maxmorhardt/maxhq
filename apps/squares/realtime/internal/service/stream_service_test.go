package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// a running hub over an in-memory redis
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

// appends a contest event the way the contests relay does and returns its entry id
func publish(t *testing.T, client *redis.Client, contestID uuid.UUID, eventType string) string {
	t.Helper()
	data, err := json.Marshal(events.ContestEventHeader{Type: eventType, ContestID: contestID})
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
	publish(t, client, contestID, events.SquareUpdateType)
	last := publish(t, client, contestID, events.SquareUpdateType)

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	require.NotNil(t, sub.Snapshot)
	assert.Equal(t, last, sub.SnapshotID, "the snapshot already reflects everything up to here")

	// other contests have their own streams and never reach this subscription
	publish(t, client, uuid.New(), events.SquareUpdateType)
	live := publish(t, client, contestID, events.ContestUpdateType)

	e := next(t, sub)
	assert.Equal(t, live, e.ID)
	assert.Equal(t, events.ContestUpdateType, e.Header.Type)
}

func TestSubscribe_EmptyStreamSnapshotStartsAtZero(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", "")
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Equal(t, "0-0", sub.SnapshotID)
	first := publish(t, client, contestID, events.SquareUpdateType)
	assert.Equal(t, first, next(t, sub).ID)
}

func TestSubscribe_ResumeReplaysOnlyTheGap(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	seen := publish(t, client, contestID, events.SquareUpdateType)
	missed1 := publish(t, client, contestID, events.SquareUpdateType)
	missed2 := publish(t, client, contestID, events.ParticipantAddedType)

	sub, err := service.NewStreamService(client, hub, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", seen)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Nil(t, sub.Snapshot, "nothing was lost, so no snapshot")
	assert.Equal(t, missed1, next(t, sub).ID)
	assert.Equal(t, missed2, next(t, sub).ID)

	live := publish(t, client, contestID, events.ContestUpdateType)
	assert.Equal(t, live, next(t, sub).ID, "live events follow the replay without repeats")
}

func TestSubscribe_TrimmedOrUnknownIDFallsBackToASnapshot(t *testing.T) {
	client, hub := newHub(t)
	contestID := uuid.New()
	publish(t, client, contestID, events.SquareUpdateType)
	last := publish(t, client, contestID, events.SquareUpdateType)
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

	id := publish(t, client, contestID, events.SquareUpdateType)

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
		name   string
		header events.ContestEventHeader
		want   bool
	}{
		{"made private", events.ContestEventHeader{Type: events.ContestUpdateType, Contest: &events.ContestVisibility{Visibility: events.ContestVisibilityPrivate}}, true},
		{"made public", events.ContestEventHeader{Type: events.ContestUpdateType, Contest: &events.ContestVisibility{Visibility: "public"}}, false},
		{"contest update without contest", events.ContestEventHeader{Type: events.ContestUpdateType}, false},
		{"viewer removed", events.ContestEventHeader{Type: events.ParticipantRemovedType, Participant: &events.ParticipantRef{UserID: "v@b.com"}}, true},
		{"someone else removed", events.ContestEventHeader{Type: events.ParticipantRemovedType, Participant: &events.ParticipantRef{UserID: "x@b.com"}}, false},
		{"square update", events.ContestEventHeader{Type: events.SquareUpdateType}, false},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.want, service.RequiresAccessCheck(&tt.header, "v@b.com"), tt.name)
	}
}
