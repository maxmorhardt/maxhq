package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
	cacheRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_requests_total",
			Help: "Total number of distributed cache lookups by cache name and result",
		},
		[]string{"cache", "result"},
	)

	redisErrorsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "redis_errors_total",
			Help: "Total number of redis failures by operation; callers fail open, so these never surface as 5xx",
		},
		[]string{"operation"},
	)

	idempotentRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "idempotent_requests_total",
			Help: "Total number of requests carrying an Idempotency-Key by outcome",
		},
		[]string{"outcome"},
	)
)

func init() {
	prometheus.MustRegister(
		cacheRequestsTotal,
		redisErrorsTotal,
		idempotentRequestsTotal,
	)
}

func IncCacheRequest(cache string, hit bool) {
	if hit {
		cacheRequestsTotal.WithLabelValues(cache, "hit").Inc()
		return
	}
	cacheRequestsTotal.WithLabelValues(cache, "miss").Inc()
}

func IncRedisError(operation string) {
	redisErrorsTotal.WithLabelValues(operation).Inc()
}

func IncIdempotentRequest(outcome string) {
	idempotentRequestsTotal.WithLabelValues(outcome).Inc()
}
