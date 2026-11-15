package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	contestsCreatedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "contests_created_total",
			Help: "Total number of contests created",
		},
	)

	contestsDeletedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "contests_deleted_total",
			Help: "Total number of contests deleted",
		},
	)

	contestsStartedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "contests_started_total",
			Help: "Total number of contests transitioned out of the active/setup phase",
		},
	)

	quarterResultsRecordedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "quarter_results_recorded_total",
			Help: "Total number of quarter results recorded by quarter",
		},
		[]string{"quarter"},
	)

	limitsReachedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "limits_reached_total",
			Help: "Total number of creations refused by a per-account or per-contest cap",
		},
		[]string{"limit"},
	)

	playersJoinedTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "players_joined_total",
			Help: "Total number of players joined a contest by role",
		},
		[]string{"role"},
	)

	playersRemovedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "players_removed_total",
			Help: "Total number of players removed from a contest",
		},
	)

	playersBannedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "players_banned_total",
			Help: "Total number of players banned from a contest",
		},
	)

	playersUnbannedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "players_unbanned_total",
			Help: "Total number of players unbanned from a contest",
		},
	)

	inviteLinksResetTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "invite_links_reset_total",
			Help: "Total number of contest invite links reset",
		},
	)

	squaresClaimedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "squares_claimed_total",
			Help: "Total number of squares claimed by users",
		},
	)

	squaresClearedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "squares_cleared_total",
			Help: "Total number of squares cleared",
		},
	)

	recapEmailsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "recap_emails_total",
			Help: "Contest recap emails by result: sent, unconfirmed (maybe delivered, not retried) or failed per player, aborted per contest that could not be prepared",
		},
		[]string{"result"},
	)
)

func init() {
	prometheus.MustRegister(
		contestsCreatedTotal,
		contestsDeletedTotal,
		contestsStartedTotal,
		quarterResultsRecordedTotal,
		limitsReachedTotal,
		playersJoinedTotal,
		playersRemovedTotal,
		playersBannedTotal,
		playersUnbannedTotal,
		inviteLinksResetTotal,
		squaresClaimedTotal,
		squaresClearedTotal,
		recapEmailsTotal,
	)
	for _, result := range []string{RecapSent, RecapUnconfirmed, RecapFailed, RecapAborted} {
		recapEmailsTotal.WithLabelValues(result)
	}
}

func IncContestCreated() {
	contestsCreatedTotal.Inc()
}

func IncContestDeleted() {
	contestsDeletedTotal.Inc()
}

func IncContestStarted() {
	contestsStartedTotal.Inc()
}

func IncQuarterResult(quarter int) {
	quarterResultsRecordedTotal.WithLabelValues(quarterLabel(quarter)).Inc()
}

func IncLimitReached(limit string) {
	limitsReachedTotal.WithLabelValues(limit).Inc()
}

func IncPlayerJoined(role string) {
	playersJoinedTotal.WithLabelValues(role).Inc()
}

func IncPlayerRemoved() {
	playersRemovedTotal.Inc()
}

func IncPlayerBanned() {
	playersBannedTotal.Inc()
}

func IncPlayerUnbanned() {
	playersUnbannedTotal.Inc()
}

func IncInviteLinkReset() {
	inviteLinksResetTotal.Inc()
}

func IncSquareClaimed() {
	squaresClaimedTotal.Inc()
}

func IncSquareCleared() {
	squaresClearedTotal.Inc()
}

const (
	RecapSent        = "sent"
	RecapUnconfirmed = "unconfirmed"
	RecapFailed      = "failed"
	RecapAborted     = "aborted"
)

func AddRecapEmails(result string, n int) {
	recapEmailsTotal.WithLabelValues(result).Add(float64(n))
}

func quarterLabel(q int) string {
	switch q {
	case 1:
		return "1"
	case 2:
		return "2"
	case 3:
		return "3"
	case 4:
		return "4"
	default:
		return "unknown"
	}
}
