package messaging

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging/natstest"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	nc := natstest.Run(t)
	js, err := InitJetStream(context.Background(), nc, model.NATSConfig{StreamMaxAge: time.Hour})
	require.NoError(t, err)
	return js
}

func TestConsume_AcksHandledMessagesAndRespectsFilters(t *testing.T) {
	js := newJetStream(t)
	ctx := context.Background()

	received := make(chan string, 2)
	stop, err := Consume(ctx, js, ConsumerSpec{Durable: "test-ok", FilterSubjects: []string{"squares.games.>"}}, func(_ context.Context, msg jetstream.Msg) error {
		received <- string(msg.Data())
		return nil
	})
	require.NoError(t, err)
	t.Cleanup(stop)

	_, err = js.Publish(ctx, "squares.games.1", []byte("one"))
	require.NoError(t, err)
	_, err = js.Publish(ctx, "squares.users.updated", []byte("ignored"))
	require.NoError(t, err)

	select {
	case got := <-received:
		assert.Equal(t, "one", got)
	case <-time.After(5 * time.Second):
		t.Fatal("message not consumed")
	}

	select {
	case got := <-received:
		t.Fatalf("filtered subject delivered: %s", got)
	case <-time.After(200 * time.Millisecond):
	}
}

func TestConsume_RedeliversAfterHandlerError(t *testing.T) {
	js := newJetStream(t)
	ctx := context.Background()

	var attempts atomic.Int32
	done := make(chan struct{})
	stop, err := Consume(ctx, js, ConsumerSpec{Durable: "test-retry", FilterSubjects: []string{"squares.users.>"}}, func(context.Context, jetstream.Msg) error {
		if attempts.Add(1) == 1 {
			return errors.New("transient")
		}
		close(done)
		return nil
	})
	require.NoError(t, err)
	t.Cleanup(stop)

	_, err = js.Publish(ctx, "squares.users.deleted", []byte("x"))
	require.NoError(t, err)

	select {
	case <-done:
		assert.Equal(t, int32(2), attempts.Load())
	case <-time.After(10 * time.Second):
		t.Fatal("message was not redelivered")
	}
}

func TestConsume_FailsWithoutStream(t *testing.T) {
	nc := natstest.Run(t)
	js, err := jetstream.New(nc)
	require.NoError(t, err)

	_, err = Consume(context.Background(), js, ConsumerSpec{Durable: "x"}, func(context.Context, jetstream.Msg) error { return nil })

	assert.Error(t, err)
}

type stubMsg struct {
	jetstream.Msg
	delivered uint64
	err       error
}

func (s stubMsg) Metadata() (*jetstream.MsgMetadata, error) {
	if s.err != nil {
		return nil, s.err
	}
	return &jetstream.MsgMetadata{NumDelivered: s.delivered}, nil
}

func TestRedeliveryDelay(t *testing.T) {
	assert.Equal(t, time.Second, redeliveryDelay(stubMsg{delivered: 1}))
	assert.Equal(t, 4*time.Second, redeliveryDelay(stubMsg{delivered: 3}))
	assert.Equal(t, maxRedeliveryGap, redeliveryDelay(stubMsg{delivered: 50}))
	assert.Equal(t, time.Second, redeliveryDelay(stubMsg{err: errors.New("no metadata")}))
}
