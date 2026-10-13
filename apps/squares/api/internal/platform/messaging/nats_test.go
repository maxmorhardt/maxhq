package messaging

import (
	"context"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging/natstest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitNATS_InvalidURL(t *testing.T) {
	conn, err := InitNATS(model.NATSConfig{URL: "nats://127.0.0.1:1"})

	require.Error(t, err)
	assert.Nil(t, conn)
	assert.Contains(t, err.Error(), "failed to connect to NATS")
}

func TestInitNATS_MalformedURL(t *testing.T) {
	conn, err := InitNATS(model.NATSConfig{URL: "not-a-valid-url"})

	require.Error(t, err)
	assert.Nil(t, conn)
	assert.Contains(t, err.Error(), "failed to connect to NATS")
}

func TestInitNATS_Connects(t *testing.T) {
	server := natstest.Run(t)

	conn, err := InitNATS(model.NATSConfig{URL: natstest.URL(server)})

	require.NoError(t, err)
	t.Cleanup(conn.Close)
	assert.True(t, conn.IsConnected())
}

func TestInitJetStream_CreatesStreamIdempotently(t *testing.T) {
	nc := natstest.Run(t)
	ctx := context.Background()
	cfg := model.NATSConfig{StreamReplicas: 0, StreamMaxAge: time.Hour}

	js, err := InitJetStream(ctx, nc, cfg)
	require.NoError(t, err)

	// a second service booting must not fail on the existing stream
	_, err = InitJetStream(ctx, nc, cfg)
	require.NoError(t, err)

	stream, err := js.Stream(ctx, events.StreamName)
	require.NoError(t, err)
	info, err := stream.Info(ctx)
	require.NoError(t, err)
	assert.Equal(t, []string{events.AllSubjects}, info.Config.Subjects)
	assert.Equal(t, 1, info.Config.Replicas)
	assert.Equal(t, duplicateWindow, info.Config.Duplicates)
}

func TestInitJetStream_FailsWhenReplicasExceedCluster(t *testing.T) {
	nc := natstest.Run(t)

	_, err := InitJetStream(context.Background(), nc, model.NATSConfig{StreamReplicas: 3, StreamMaxAge: time.Hour})

	assert.Error(t, err)
}
