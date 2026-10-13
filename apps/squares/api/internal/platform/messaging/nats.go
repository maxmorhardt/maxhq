package messaging

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

// jetstream drops a repeated Nats-Msg-Id inside this window, which absorbs outbox relay retries
const duplicateWindow = 10 * time.Minute

func InitNATS(cfg model.NATSConfig) (*nats.Conn, error) {
	natsConn, err := nats.Connect(
		cfg.URL,
		nats.MaxReconnects(-1),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			slog.Info("NATS reconnected", "url", nc.ConnectedUrl())
			metrics.IncNATSReconnect()
			metrics.SetNATSConnected(true)
		}),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			slog.Warn("NATS disconnected", "error", err)
			metrics.IncNATSDisconnect()
			metrics.SetNATSConnected(false)
		}),
		nats.ClosedHandler(func(_ *nats.Conn) {
			slog.Info("NATS connection closed")
			metrics.SetNATSConnected(false)
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	metrics.SetNATSConnected(true)
	slog.Info("NATS connection established successfully", "url", cfg.URL)
	return natsConn, nil
}

// every service ensures the stream on startup, so whichever boots first creates it and the rest no-op
func InitJetStream(ctx context.Context, nc *nats.Conn, cfg model.NATSConfig) (jetstream.JetStream, error) {
	js, err := jetstream.New(nc)
	if err != nil {
		return nil, fmt.Errorf("failed to create jetstream context: %w", err)
	}

	replicas := cfg.StreamReplicas
	if replicas < 1 {
		replicas = 1
	}

	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:       events.StreamName,
		Subjects:   []string{events.AllSubjects},
		Storage:    jetstream.FileStorage,
		Retention:  jetstream.LimitsPolicy,
		Discard:    jetstream.DiscardOld,
		MaxAge:     cfg.StreamMaxAge,
		Replicas:   replicas,
		Duplicates: duplicateWindow,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to ensure %s stream: %w", events.StreamName, err)
	}

	slog.Info("jetstream stream ready", "stream", events.StreamName, "replicas", replicas, "max_age", cfg.StreamMaxAge)
	return js, nil
}
