package database

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type fakeReplica struct {
	mu     sync.Mutex
	err    error
	pings  int
	closed bool
}

func (f *fakeReplica) PingContext(context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.pings++
	return f.err
}

func (f *fakeReplica) Close() error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.closed = true
	return nil
}

func (f *fakeReplica) setErr(err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.err = err
}

func (f *fakeReplica) pingCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.pings
}

func fastMonitor(conn replicaConn) *replicaMonitor {
	m := newReplicaMonitor(conn)
	m.interval = 5 * time.Millisecond
	m.minBackoff = time.Millisecond
	m.maxBackoff = 4 * time.Millisecond
	return m
}

func TestReplicaMonitor_Resolve(t *testing.T) {
	replica, primary := &sql.DB{}, &sql.DB{}
	pools := []gorm.ConnPool{replica, primary}
	m := newReplicaMonitor(&fakeReplica{})

	assert.Same(t, primary, m.Resolve(pools))

	m.healthy.Store(true)
	assert.Same(t, replica, m.Resolve(pools))
}

func TestReplicaMonitor_ResolveSinglePool(t *testing.T) {
	only := &sql.DB{}
	m := newReplicaMonitor(&fakeReplica{})

	assert.Same(t, only, m.Resolve([]gorm.ConnPool{only}))
}

func TestReplicaMonitor_Check(t *testing.T) {
	conn := &fakeReplica{err: errors.New("connection refused")}
	m := newReplicaMonitor(conn)

	require.Error(t, m.check())
	assert.False(t, m.healthy.Load())

	conn.setErr(nil)
	require.NoError(t, m.check())
	assert.True(t, m.healthy.Load())
}

func TestReplicaMonitor_RunRecoversAndFailsOver(t *testing.T) {
	conn := &fakeReplica{err: errors.New("connection refused")}
	m := fastMonitor(conn)
	go m.run()
	t.Cleanup(m.close)

	conn.setErr(nil)
	assert.Eventually(t, m.healthy.Load, time.Second, time.Millisecond)

	conn.setErr(errors.New("connection refused"))
	assert.Eventually(t, func() bool { return !m.healthy.Load() }, time.Second, time.Millisecond)
}

func TestReplicaMonitor_RunKeepsRetryingWhileDown(t *testing.T) {
	conn := &fakeReplica{err: errors.New("connection refused")}
	m := fastMonitor(conn)
	go m.run()
	t.Cleanup(m.close)

	assert.Eventually(t, func() bool { return conn.pingCount() >= 5 }, time.Second, time.Millisecond)
	assert.False(t, m.healthy.Load())
}

func TestReplicaMonitor_CloseStopsRunAndClosesConn(t *testing.T) {
	conn := &fakeReplica{}
	m := newReplicaMonitor(conn)
	go m.run()

	m.close()

	assert.True(t, conn.closed)
	_, open := <-m.done
	assert.False(t, open)
}

func TestReplicaMonitor_CloseTwiceIsSafe(t *testing.T) {
	m := newReplicaMonitor(&fakeReplica{})
	go m.run()

	m.close()
	assert.NotPanics(t, m.close)
}
