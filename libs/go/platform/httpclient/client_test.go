package httpclient

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type payload struct {
	N int `json:"n"`
}

func TestGetJSON_SendsTokenAndDecodes(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "secret", r.Header.Get(middleware.HeaderInternalToken))
		assert.Equal(t, "/internal/x", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"n":4}`))
	}))
	defer srv.Close()

	var got payload
	require.NoError(t, NewInternal(srv.URL+"/", "secret").GetJSON(context.Background(), "/internal/x", &got))
	assert.Equal(t, 4, got.N)
}

func TestGetJSON_RetriesServerErrorsThenSucceeds(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if calls.Add(1) < 3 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"n":1}`))
	}))
	defer srv.Close()

	var got payload
	require.NoError(t, NewInternal(srv.URL, "t").GetJSON(context.Background(), "/", &got))
	assert.Equal(t, int32(3), calls.Load())
}

func TestGetJSON_ReturnsStatusErrorWithoutRetryingClientErrors(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	err := NewInternal(srv.URL, "t").GetJSON(context.Background(), "/p", &payload{})

	var status *StatusError
	require.True(t, errors.As(err, &status))
	assert.Equal(t, http.StatusForbidden, status.Status)
	assert.Equal(t, int32(1), calls.Load())
	assert.Contains(t, err.Error(), "403")
}

func TestGetJSON_NetworkError(t *testing.T) {
	err := NewInternal("http://127.0.0.1:1", "t").GetJSON(context.Background(), "/", &payload{})
	assert.Error(t, err)
}

func TestGetJSON_ForwardsTheRequestID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "req-1", r.Header.Get(middleware.HeaderRequestID))
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"n":1}`))
	}))
	defer srv.Close()

	ctx := context.WithValue(context.Background(), api.RequestIDKey, "req-1")
	var got payload
	require.NoError(t, NewInternal(srv.URL, "t").GetJSON(ctx, "/", &got))
}
