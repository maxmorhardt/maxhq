package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging/natstest"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/service"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	js, err := messaging.InitJetStream(context.Background(), natstest.Run(t), model.NATSConfig{StreamMaxAge: time.Hour})
	require.NoError(t, err)
	return js
}

func publish(t *testing.T, js jetstream.JetStream, contestID uuid.UUID, eventType string) uint64 {
	t.Helper()
	data, err := json.Marshal(model.ContestEvent{Type: eventType, ContestID: contestID})
	require.NoError(t, err)
	ack, err := js.Publish(context.Background(), events.ContestSubject(contestID), data)
	require.NoError(t, err)
	return ack.Sequence
}

func allowAll(t *testing.T, contestID uuid.UUID) *mocks.ContestAccessClient {
	t.Helper()
	c := mocks.NewContestAccessClient(t)
	c.EXPECT().GetSnapshot(mock.Anything, contestID, "v@b.com").
		Return(&model.ContestSnapshot{Contest: &model.Contest{ID: contestID}}, nil).Maybe()
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
	js := newStream(t)
	contestID := uuid.New()
	publish(t, js, contestID, model.SquareUpdateType)
	last := publish(t, js, contestID, model.SquareUpdateType)

	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", nil)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	require.NotNil(t, sub.Snapshot)
	assert.Equal(t, last, sub.SnapshotSeq, "the snapshot already reflects everything up to here")

	// events from another contest share the stream but never reach this subscription
	publish(t, js, uuid.New(), model.SquareUpdateType)
	live := publish(t, js, contestID, model.ContestUpdateType)

	e := next(t, sub)
	assert.Equal(t, live, e.Seq)
	assert.Equal(t, model.ContestUpdateType, e.Event.Type)
}

func TestSubscribe_ResumeReplaysOnlyTheGap(t *testing.T) {
	js := newStream(t)
	contestID := uuid.New()
	seen := publish(t, js, contestID, model.SquareUpdateType)
	missed := publish(t, js, contestID, model.QuarterResultUpdateType)

	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", &seen)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Nil(t, sub.Snapshot, "a client that can replay keeps its own state")
	e := next(t, sub)
	assert.Equal(t, missed, e.Seq)
	assert.Equal(t, model.QuarterResultUpdateType, e.Event.Type)
}

func TestSubscribe_UnknownLastEventIDFallsBackToASnapshot(t *testing.T) {
	js := newStream(t)
	contestID := uuid.New()
	publish(t, js, contestID, model.SquareUpdateType)
	future := uint64(999)

	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", &future)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.NotNil(t, sub.Snapshot)
}

func TestSubscribe_EmptyStream(t *testing.T) {
	js := newStream(t)
	contestID := uuid.New()

	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", nil)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	assert.Zero(t, sub.SnapshotSeq)
	first := publish(t, js, contestID, model.SquareUpdateType)
	assert.Equal(t, first, next(t, sub).Seq)
}

func TestSubscribe_SkipsUndecodableEvents(t *testing.T) {
	js := newStream(t)
	contestID := uuid.New()
	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", nil)
	require.NoError(t, err)
	t.Cleanup(sub.Stop)

	_, err = js.Publish(context.Background(), events.ContestSubject(contestID), []byte("{"))
	require.NoError(t, err)
	good := publish(t, js, contestID, model.SquareUpdateType)

	assert.Equal(t, good, next(t, sub).Seq)
}

func TestSubscribe_StopClosesTheChannel(t *testing.T) {
	js := newStream(t)
	contestID := uuid.New()
	sub, err := service.NewStreamService(js, allowAll(t, contestID), nil).Subscribe(context.Background(), contestID, "v@b.com", nil)
	require.NoError(t, err)

	sub.Stop()

	select {
	case _, ok := <-sub.Events:
		assert.False(t, ok)
	case <-time.After(5 * time.Second):
		t.Fatal("events channel stayed open after stop")
	}
}

func TestSubscribe_AccessIsCheckedEvenWhenResuming(t *testing.T) {
	js := newStream(t)
	seq := publish(t, js, uuid.New(), model.SquareUpdateType)
	contests := mocks.NewContestAccessClient(t)
	contests.EXPECT().GetSnapshot(mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrInsufficientRole)

	_, err := service.NewStreamService(js, contests, nil).Subscribe(context.Background(), uuid.New(), "v@b.com", &seq)

	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestSubscribe_FailsWithoutTheStream(t *testing.T) {
	js, err := jetstream.New(natstest.Run(t))
	require.NoError(t, err)

	_, err = service.NewStreamService(js, mocks.NewContestAccessClient(t), nil).Subscribe(context.Background(), uuid.New(), "v", nil)

	assert.ErrorIs(t, err, errs.ErrDependencyFailed)
}

func TestCheckAccessAndIsRevoked(t *testing.T) {
	contestID := uuid.New()
	contests := mocks.NewContestAccessClient(t)
	contests.EXPECT().GetSnapshot(mock.Anything, contestID, "v").Return(nil, errs.ErrContestNotFound)
	revocations := mocks.NewRevocationStore(t)
	revocations.EXPECT().IsRevoked(mock.Anything, "v", int64(10)).Return(true, nil)
	svc := service.NewStreamService(nil, contests, revocations)

	assert.ErrorIs(t, svc.CheckAccess(context.Background(), contestID, "v"), errs.ErrContestNotFound)
	revoked, err := svc.IsRevoked(context.Background(), "v", 10)
	require.NoError(t, err)
	assert.True(t, revoked)
}

func TestRequiresAccessCheck(t *testing.T) {
	private := &model.Contest{Visibility: model.ContestVisibilityPrivate}
	public := &model.Contest{Visibility: model.ContestVisibilityPublic}

	tests := []struct {
		name  string
		event model.ContestEvent
		want  bool
	}{
		{"contest went private", model.ContestEvent{Type: model.ContestUpdateType, Contest: private}, true},
		{"contest still public", model.ContestEvent{Type: model.ContestUpdateType, Contest: public}, false},
		{"contest update without body", model.ContestEvent{Type: model.ContestUpdateType}, false},
		{"viewer was removed", model.ContestEvent{Type: model.ParticipantRemovedType, Participant: &model.ContestParticipant{UserID: "v"}}, true},
		{"someone else was removed", model.ContestEvent{Type: model.ParticipantRemovedType, Participant: &model.ContestParticipant{UserID: "x"}}, false},
		{"square update", model.ContestEvent{Type: model.SquareUpdateType}, false},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.want, service.RequiresAccessCheck(&tt.event, "v"), tt.name)
	}
}
