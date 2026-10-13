package metrics

import (
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/model"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	sseStreamsActive = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "sse_streams_active",
			Help: "Number of currently open server-sent event streams",
		},
	)

	sseStreamsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sse_streams_total",
			Help: "Total number of server-sent event stream attempts by result",
		},
		[]string{"result"},
	)

	sseStreamResumesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sse_stream_resumes_total",
			Help: "Total number of streams opened with a Last-Event-ID, by whether the gap could be replayed",
		},
		[]string{"replayed"},
	)

	sseStreamClosesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sse_stream_closes_total",
			Help: "Total number of server-sent event streams closed by reason",
		},
		[]string{"reason"},
	)

	sseStreamDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "sse_stream_duration_seconds",
			Help:    "Duration of server-sent event streams from open to close",
			Buckets: []float64{1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600, 7200},
		},
	)

	hubContestsWatched = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "realtime_contests_watched",
			Help: "Contests with at least one open stream on this replica, all read through one redis connection",
		},
	)

	hubReadErrorsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "realtime_stream_read_errors_total",
			Help: "Total number of failed reads of the contest streams",
		},
	)

	sseEventsSentTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "sse_events_sent_total",
			Help: "Total number of server-sent events written to clients by type",
		},
		[]string{"type"},
	)
)

func init() {
	prometheus.MustRegister(
		sseStreamsActive,
		sseStreamsTotal,
		sseStreamResumesTotal,
		sseStreamClosesTotal,
		sseStreamDuration,
		sseEventsSentTotal,
		hubContestsWatched,
		hubReadErrorsTotal,
	)
}

func RecordStreamResult(result model.StreamResult) {
	sseStreamsTotal.WithLabelValues(string(result)).Inc()
}

func RecordStreamResume(replayed bool) {
	if replayed {
		sseStreamResumesTotal.WithLabelValues("true").Inc()
		return
	}
	sseStreamResumesTotal.WithLabelValues("false").Inc()
}

func RecordStreamClose(reason model.StreamCloseReason) {
	sseStreamClosesTotal.WithLabelValues(string(reason)).Inc()
}

func IncActiveStreams() {
	sseStreamsActive.Inc()
}

func DecActiveStreams() {
	sseStreamsActive.Dec()
}

func ObserveStreamDuration(d time.Duration) {
	sseStreamDuration.Observe(d.Seconds())
}

func IncEventSent(eventType string) {
	sseEventsSentTotal.WithLabelValues(eventType).Inc()
}

func SetContestsWatched(n int) {
	hubContestsWatched.Set(float64(n))
}

func IncStreamReadError() {
	hubReadErrorsTotal.Inc()
}
