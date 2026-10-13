package clients

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetUserActivity(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/internal/users/a+b@c.com/activity", r.URL.Path)
		assert.Equal(t, "s3cret", r.Header.Get(middleware.HeaderInternalToken))
		_, _ = w.Write([]byte(`{"activeContests":[{"id":"1","name":"C","owner":"a","role":"owner"}],"firstActivity":"2025-09-01T00:00:00Z"}`))
	}))
	t.Cleanup(srv.Close)

	summary, err := NewContestActivityClient(srv.URL+"/", "s3cret").GetUserActivity(context.Background(), "a+b@c.com")

	require.NoError(t, err)
	assert.Len(t, summary.ActiveContests, 1)
	require.NotNil(t, summary.FirstActivity)
	assert.Equal(t, 2025, summary.FirstActivity.Year())
}

func TestGetUserActivity_Failures(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
	}{
		{"server error", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusInternalServerError) }},
		{"bad json", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("{")) }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := httptest.NewServer(tt.handler)
			t.Cleanup(srv.Close)

			_, err := NewContestActivityClient(srv.URL, "s3cret").GetUserActivity(context.Background(), "a@b.com")

			assert.Error(t, err)
		})
	}
}

func TestGetUserActivity_Unreachable(t *testing.T) {
	_, err := NewContestActivityClient("http://127.0.0.1:1", "s3cret").GetUserActivity(context.Background(), "a@b.com")
	assert.Error(t, err)

	_, err = NewContestActivityClient("://bad", "s3cret").GetUserActivity(context.Background(), "a@b.com")
	assert.Error(t, err)
}
