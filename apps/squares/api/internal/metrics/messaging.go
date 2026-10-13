package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
	outboxPublishedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "outbox_events_published_total",
			Help: "Total number of outbox events relayed to JetStream by result",
		},
		[]string{"result"},
	)

	outboxPending = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "outbox_events_pending",
			Help: "Outbox events still waiting to be relayed after the last relay pass",
		},
	)

	outboxOldestPendingSeconds = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "outbox_oldest_pending_seconds",
			Help: "Age of the oldest unrelayed outbox event after the last relay pass",
		},
	)

	consumerMessagesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "jetstream_consumer_messages_total",
			Help: "Total number of JetStream messages handled by consumer and result",
		},
		[]string{"consumer", "result"},
	)
)

func init() {
	prometheus.MustRegister(
		outboxPublishedTotal,
		outboxPending,
		outboxOldestPendingSeconds,
		consumerMessagesTotal,
	)
}

func IncOutboxPublished(success bool) {
	if success {
		outboxPublishedTotal.WithLabelValues("success").Inc()
		return
	}
	outboxPublishedTotal.WithLabelValues("error").Inc()
}

func SetOutboxBacklog(pending int64, oldestSeconds float64) {
	outboxPending.Set(float64(pending))
	outboxOldestPendingSeconds.Set(oldestSeconds)
}

func IncConsumerMessage(consumer, result string) {
	consumerMessagesTotal.WithLabelValues(consumer, result).Inc()
}
