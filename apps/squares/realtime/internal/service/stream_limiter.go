package service

import "sync"

type StreamLimiter interface {
	// reserves one of key's streams, or reports false when key already holds the limit
	Acquire(key string) (release func(), ok bool)
}

type streamLimiter struct {
	limit int
	mu    sync.Mutex
	open  map[string]int
}

// a limit of 0 or less disables it; it holds per pod, so the cluster-wide ceiling is limit times replicas
func NewStreamLimiter(limit int) StreamLimiter {
	return &streamLimiter{limit: limit, open: make(map[string]int)}
}

func (l *streamLimiter) Acquire(key string) (func(), bool) {
	if l.limit <= 0 {
		return func() {}, true
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	if l.open[key] >= l.limit {
		return nil, false
	}
	l.open[key]++

	var once sync.Once
	return func() { once.Do(func() { l.release(key) }) }, true
}

func (l *streamLimiter) release(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.open[key]--
	if l.open[key] <= 0 {
		delete(l.open, key)
	}
}
