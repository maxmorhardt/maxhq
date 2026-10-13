package clients

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetSnapshot(t *testing.T) {
	contestID := uuid.New()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/internal/contests/"+contestID.String()+"/snapshot", r.URL.Path)
		assert.Equal(t, "v+1@b.com", r.URL.Query().Get("user"))
		assert.Equal(t, "s3cret", r.Header.Get(middleware.HeaderInternalToken))
		_, _ = w.Write([]byte(`{"contest":{"id":"` + contestID.String() + `"},"participants":[{"userId":"o"}]}`))
	}))
	t.Cleanup(srv.Close)

	snap, err := NewContestAccessClient(srv.URL, "s3cret").GetSnapshot(context.Background(), contestID, "v+1@b.com")

	require.NoError(t, err)
	assert.JSONEq(t, `{"id":"`+contestID.String()+`"}`, string(snap.Contest), "passed through untouched")
	assert.JSONEq(t, `[{"userId":"o"}]`, string(snap.Participants))
}

func TestGetSnapshot_StatusMapping(t *testing.T) {
	tests := []struct {
		status int
		body   string
		want   error
	}{
		{http.StatusNotFound, "", errs.ErrContestNotFound},
		{http.StatusForbidden, "", errs.ErrInsufficientRole},
		{http.StatusInternalServerError, "", errs.ErrDependencyFailed},
		{http.StatusOK, "{", errs.ErrDependencyFailed},
	}

	for _, tt := range tests {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(tt.status)
			_, _ = w.Write([]byte(tt.body))
		}))

		_, err := NewContestAccessClient(srv.URL, "s3cret").GetSnapshot(context.Background(), uuid.New(), "v")
		srv.Close()

		assert.ErrorIs(t, err, tt.want, "status %d", tt.status)
	}
}

func TestGetSnapshot_Unreachable(t *testing.T) {
	_, err := NewContestAccessClient("http://127.0.0.1:1", "s3cret").GetSnapshot(context.Background(), uuid.New(), "v")
	assert.ErrorIs(t, err, errs.ErrDependencyFailed)

	_, err = NewContestAccessClient("://bad", "s3cret").GetSnapshot(context.Background(), uuid.New(), "v")
	assert.Error(t, err)
}
