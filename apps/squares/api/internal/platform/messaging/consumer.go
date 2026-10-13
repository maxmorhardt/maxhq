package messaging

import (
	"context"
	"fmt"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	consumerAckWait  = 30 * time.Second
	maxRedeliveryGap = 2 * time.Minute
)

type Handler func(ctx context.Context, msg jetstream.Msg) error

type ConsumerSpec struct {
	Durable        string
	FilterSubjects []string
}

// a durable consumer shared by every replica; one message in flight at a time keeps processing in stream order
func Consume(ctx context.Context, js jetstream.JetStream, spec ConsumerSpec, handler Handler) (stop func(), err error) {
	cons, err := js.CreateOrUpdateConsumer(ctx, events.StreamName, jetstream.ConsumerConfig{
		Durable:        spec.Durable,
		FilterSubjects: spec.FilterSubjects,
		AckPolicy:      jetstream.AckExplicitPolicy,
		DeliverPolicy:  jetstream.DeliverAllPolicy,
		AckWait:        consumerAckWait,
		MaxDeliver:     -1,
		MaxAckPending:  1,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to ensure consumer %s: %w", spec.Durable, err)
	}

	log := util.LoggerFromContext(ctx).With("consumer", spec.Durable)
	cc, err := cons.Consume(
		func(msg jetstream.Msg) {
			handle(util.ContextWithLogger(ctx, log.With("subject", msg.Subject())), spec.Durable, msg, handler)
		},
		jetstream.ConsumeErrHandler(func(_ jetstream.ConsumeContext, err error) {
			log.Warn("jetstream consume error", "error", err)
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to start consumer %s: %w", spec.Durable, err)
	}

	log.Info("jetstream consumer started", "filters", spec.FilterSubjects)
	return cc.Stop, nil
}

func handle(ctx context.Context, durable string, msg jetstream.Msg, handler Handler) {
	log := util.LoggerFromContext(ctx)

	if err := handler(ctx, msg); err != nil {
		delay := redeliveryDelay(msg)
		log.Warn("failed to handle event, redelivering", "error", err, "delay", delay)
		metrics.IncConsumerMessage(durable, "error")
		if nakErr := msg.NakWithDelay(delay); nakErr != nil {
			log.Error("failed to nak event", "error", nakErr)
		}
		return
	}

	if err := msg.Ack(); err != nil {
		log.Error("failed to ack event", "error", err)
		metrics.IncConsumerMessage(durable, "ack_error")
		return
	}

	metrics.IncConsumerMessage(durable, "success")
}

// back off exponentially per delivery so a poison message cannot hot-loop the only in-flight slot
func redeliveryDelay(msg jetstream.Msg) time.Duration {
	delivered := uint64(1)
	if md, err := msg.Metadata(); err == nil && md.NumDelivered > 0 {
		delivered = md.NumDelivered
	}

	delay := time.Second
	for i := uint64(1); i < delivered && delay < maxRedeliveryGap; i++ {
		delay *= 2
	}

	return min(delay, maxRedeliveryGap)
}
