package service_test

import (
	"sync"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStreamLimiter_CapsEachKeySeparately(t *testing.T) {
	l := service.NewStreamLimiter(2)

	_, ok := l.Acquire("a")
	require.True(t, ok)
	releaseA, ok := l.Acquire("a")
	require.True(t, ok)

	_, ok = l.Acquire("a")
	assert.False(t, ok, "a third stream for the same key is refused")

	_, ok = l.Acquire("b")
	assert.True(t, ok, "another key has its own allowance")

	releaseA()
	_, ok = l.Acquire("a")
	assert.True(t, ok, "a released stream frees its slot")
}

func TestStreamLimiter_ReleaseIsIdempotent(t *testing.T) {
	l := service.NewStreamLimiter(1)

	release, ok := l.Acquire("a")
	require.True(t, ok)
	release()
	release()

	_, ok = l.Acquire("a")
	assert.True(t, ok)
	_, ok = l.Acquire("a")
	assert.False(t, ok, "a double release does not grant an extra slot")
}

func TestStreamLimiter_DisabledAtZero(t *testing.T) {
	l := service.NewStreamLimiter(0)

	for range 100 {
		release, ok := l.Acquire("a")
		require.True(t, ok)
		release()
	}
}

func TestStreamLimiter_HoldsUnderConcurrency(t *testing.T) {
	l := service.NewStreamLimiter(5)

	var (
		wg      sync.WaitGroup
		mu      sync.Mutex
		granted int
	)
	for range 50 {
		wg.Go(func() {
			if _, ok := l.Acquire("a"); ok {
				mu.Lock()
				granted++
				mu.Unlock()
			}
		})
	}
	wg.Wait()

	assert.Equal(t, 5, granted)
}
