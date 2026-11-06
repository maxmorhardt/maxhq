package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func value(t *testing.T, c prometheus.Counter) float64 {
	t.Helper()
	var m dto.Metric
	require.NoError(t, c.Write(&m))
	return m.GetCounter().GetValue()
}

func TestCountersIncrement(t *testing.T) {
	tests := []struct {
		name    string
		inc     func()
		counter prometheus.Counter
	}{
		{"contest created", IncContestCreated, contestsCreatedTotal},
		{"contest deleted", IncContestDeleted, contestsDeletedTotal},
		{"contest started", IncContestStarted, contestsStartedTotal},
		{"player removed", IncPlayerRemoved, playersRemovedTotal},
		{"player banned", IncPlayerBanned, playersBannedTotal},
		{"player unbanned", IncPlayerUnbanned, playersUnbannedTotal},
		{"invite link reset", IncInviteLinkReset, inviteLinksResetTotal},
		{"square claimed", IncSquareClaimed, squaresClaimedTotal},
		{"square cleared", IncSquareCleared, squaresClearedTotal},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			before := value(t, tt.counter)
			tt.inc()
			assert.InDelta(t, before+1, value(t, tt.counter), 0)
		})
	}
}

func TestLabelledCountersIncrement(t *testing.T) {
	before := value(t, playersJoinedTotal.WithLabelValues("player"))
	IncPlayerJoined("player")
	assert.InDelta(t, before+1, value(t, playersJoinedTotal.WithLabelValues("player")), 0)

	before = value(t, limitsReachedTotal.WithLabelValues("open_contests"))
	IncLimitReached("open_contests")
	assert.InDelta(t, before+1, value(t, limitsReachedTotal.WithLabelValues("open_contests")), 0)
}

func TestQuarterResultLabels(t *testing.T) {
	for quarter, label := range map[int]string{1: "1", 2: "2", 3: "3", 4: "4", 5: "unknown"} {
		before := value(t, quarterResultsRecordedTotal.WithLabelValues(label))
		IncQuarterResult(quarter)
		assert.InDelta(t, before+1, value(t, quarterResultsRecordedTotal.WithLabelValues(label)), 0)
	}
}

func TestEveryCounterIsRegistered(t *testing.T) {
	for _, c := range []prometheus.Collector{playersBannedTotal, playersUnbannedTotal, inviteLinksResetTotal} {
		assert.ErrorAs(t, prometheus.Register(c), &prometheus.AlreadyRegisteredError{})
	}
}
