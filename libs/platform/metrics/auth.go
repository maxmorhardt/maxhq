package metrics

import (
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/prometheus/client_golang/prometheus"
)

var authFailuresTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "auth_failures_total",
		Help: "Total number of authentication failures by reason",
	},
	[]string{"reason"},
)

func init() {
	prometheus.MustRegister(authFailuresTotal)
}

func RecordAuthFailure(reason api.AuthFailureReason) {
	authFailuresTotal.WithLabelValues(string(reason)).Inc()
}
