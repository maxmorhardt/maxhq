package database

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"gorm.io/gorm"
)

const (
	replicaMonitorName   = "maxhq:replica_monitor"
	replicaCheckInterval = 2 * time.Second
	replicaPingTimeout   = time.Second
	replicaMinBackoff    = time.Second
	replicaMaxBackoff    = 10 * time.Second
)

type replicaConn interface {
	PingContext(ctx context.Context) error
	Close() error
}

// routes reads to the replica while it answers pings and to the primary otherwise, so a lost replica degrades instead of failing reads
type replicaMonitor struct {
	conn       replicaConn
	healthy    atomic.Bool
	interval   time.Duration
	minBackoff time.Duration
	maxBackoff time.Duration
	stop       chan struct{}
	done       chan struct{}
	closeOnce  sync.Once
}

func newReplicaMonitor(conn replicaConn) *replicaMonitor {
	return &replicaMonitor{
		conn:       conn,
		interval:   replicaCheckInterval,
		minBackoff: replicaMinBackoff,
		maxBackoff: replicaMaxBackoff,
		stop:       make(chan struct{}),
		done:       make(chan struct{}),
	}
}

func (m *replicaMonitor) Name() string { return replicaMonitorName }

func (m *replicaMonitor) Initialize(*gorm.DB) error { return nil }

// pools are [replica, primary]: dbresolver skips the policy when it has a single replica
func (m *replicaMonitor) Resolve(pools []gorm.ConnPool) gorm.ConnPool {
	if len(pools) < 2 || m.healthy.Load() {
		return pools[0]
	}
	return pools[1]
}

func (m *replicaMonitor) check() error {
	ctx, cancel := context.WithTimeout(context.Background(), replicaPingTimeout)
	defer cancel()

	err := m.conn.PingContext(ctx)
	m.healthy.Store(err == nil)
	return err
}

func (m *replicaMonitor) run() {
	defer close(m.done)

	backoff := m.minBackoff
	for {
		wait := m.interval
		if !m.healthy.Load() {
			wait = backoff
		}

		select {
		case <-m.stop:
			return
		case <-time.After(wait):
		}

		wasHealthy := m.healthy.Load()
		err := m.check()
		switch {
		case err == nil && !wasHealthy:
			slog.Info("read replica reachable again, routing reads to it")
			backoff = m.minBackoff
		case err != nil && wasHealthy:
			slog.Warn("read replica unreachable, routing reads to the primary", "error", err)
		case err != nil:
			backoff = min(2*backoff, m.maxBackoff)
			slog.Debug("read replica still unreachable", "error", err, "retry_in", backoff)
		}
	}
}

func (m *replicaMonitor) close() {
	m.closeOnce.Do(func() {
		close(m.stop)
		<-m.done
		_ = m.conn.Close()
	})
}
