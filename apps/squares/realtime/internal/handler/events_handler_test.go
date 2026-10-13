package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
	"github.com/maxmorhardt/maxstash/libs/squares/events"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var slowTimers = model.StreamConfig{HeartbeatInterval: time.Hour, RevocationInterval: time.Hour}

func streamRouter(svc service.StreamService, cfg model.StreamConfig, shutdown <-chan struct{}, expire int64) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		api.SetContextValue(c, api.UserKey, "v@b.com")
		api.SetContextValue(c, api.ClaimsKey, &api.Claims{Email: "v@b.com", IssuedAt: 1, Expire: expire})
		c.Next()
	})
	r.GET("/events/contests/:id", NewEventsHandler(svc, cfg, shutdown).StreamContest)
	return r
}

func farFuture() int64 { return time.Now().Add(time.Hour).Unix() }

func eventOf(t *testing.T, id string, h *events.ContestEventHeader) service.Event {
	t.Helper()
	data, err := json.Marshal(h)
	require.NoError(t, err)
	return service.Event{ID: id, Data: data, Header: *h}
}

func serve(r *gin.Engine, path string, header http.Header) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, http.NoBody)
	for k, v := range header {
		req.Header[k] = v
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestStreamContest_SnapshotThenEventsUntilDeleted(t *testing.T) {
	contestID := uuid.New()
	ch := make(chan service.Event, 2)
	ch <- eventOf(t, "8-0", &events.ContestEventHeader{Type: events.SquareUpdateType, ContestID: contestID})
	ch <- eventOf(t, "9-0", &events.ContestEventHeader{Type: events.ContestDeletedType, ContestID: contestID})
	stopped := false

	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, contestID, "v@b.com", "").Return(&service.Subscription{
		Snapshot:   &contracts.ContestSnapshot{Contest: json.RawMessage(`{"id":"` + contestID.String() + `"}`), Participants: json.RawMessage(`[]`)},
		SnapshotID: "7-0",
		Events:     ch,
		Stop:       func() { stopped = true },
	}, nil)

	w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+contestID.String(), nil)

	body := w.Body.String()
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
	assert.True(t, strings.HasPrefix(body, "retry: 3000\n\n"))
	assert.Contains(t, body, "id: 7-0\nevent: connected\ndata: {")
	assert.Contains(t, body, `"contest":{"id":"`+contestID.String()+`"}`)
	assert.Contains(t, body, "id: 8-0\nevent: square_update\n")
	assert.Contains(t, body, "id: 9-0\nevent: contest_deleted\n")
	assert.True(t, stopped, "the subscription is released when the stream ends")
}

func TestStreamContest_ResumesFromHeaderOrQuery(t *testing.T) {
	for _, tt := range []struct {
		name   string
		path   string
		header http.Header
	}{
		{"header", "", http.Header{"Last-Event-Id": {"41-0"}}},
		{"query", "?lastEventId=41-0", nil},
	} {
		t.Run(tt.name, func(t *testing.T) {
			contestID := uuid.New()
			ch := make(chan service.Event)
			close(ch)
			svc := mocks.NewStreamService(t)
			svc.EXPECT().Subscribe(mock.Anything, contestID, "v@b.com", "41-0").
				Return(&service.Subscription{Events: ch, Stop: func() {}}, nil)

			w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+contestID.String()+tt.path, tt.header)

			assert.Equal(t, http.StatusOK, w.Code)
			assert.NotContains(t, w.Body.String(), "event: connected", "a resumed stream sends no snapshot")
		})
	}
}

func TestStreamContest_RejectsBadInput(t *testing.T) {
	r := streamRouter(mocks.NewStreamService(t), slowTimers, nil, farFuture())

	assert.Equal(t, http.StatusBadRequest, serve(r, "/events/contests/nope", nil).Code)
	assert.Equal(t, http.StatusBadRequest, serve(r, "/events/contests/"+uuid.NewString()+"?lastEventId=abc", nil).Code)
	assert.Equal(t, http.StatusBadRequest, serve(r, "/events/contests/"+uuid.NewString()+"?lastEventId=41", nil).Code, "ids are <ms>-<seq>")
}

func TestStreamContest_SubscribeErrors(t *testing.T) {
	for err, want := range map[error]int{
		errs.ErrContestNotFound:  http.StatusNotFound,
		errs.ErrInsufficientRole: http.StatusForbidden,
		errs.ErrDependencyFailed: http.StatusServiceUnavailable,
	} {
		svc := mocks.NewStreamService(t)
		svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, err)

		w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+uuid.NewString(), nil)

		assert.Equal(t, want, w.Code, err.Error())
	}
}

func TestStreamContest_RevokesWhenAccessIsLost(t *testing.T) {
	contestID := uuid.New()
	ch := make(chan service.Event, 1)
	ch <- eventOf(t, "3-0", &events.ContestEventHeader{
		Type:        events.ParticipantRemovedType,
		ContestID:   contestID,
		Participant: &events.ParticipantRef{UserID: "v@b.com"},
	})
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&service.Subscription{Events: ch, Stop: func() {}}, nil)
	svc.EXPECT().CheckAccess(mock.Anything, contestID, "v@b.com").Return(errs.ErrInsufficientRole)

	w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+contestID.String(), nil)

	assert.Contains(t, w.Body.String(), "id: 3-0\nevent: revoked\n")
	assert.NotContains(t, w.Body.String(), "participant_removed")
}

func TestStreamContest_KeepsStreamingWhenAccessRecheckFails(t *testing.T) {
	contestID := uuid.New()
	ch := make(chan service.Event, 2)
	ch <- eventOf(t, "3-0", &events.ContestEventHeader{
		Type:      events.ContestUpdateType,
		ContestID: contestID,
		Contest:   &events.ContestVisibility{Visibility: events.ContestVisibilityPrivate},
	})
	close(ch)
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&service.Subscription{Events: ch, Stop: func() {}}, nil)
	svc.EXPECT().CheckAccess(mock.Anything, contestID, "v@b.com").Return(errors.New("contests briefly down"))

	w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+contestID.String(), nil)

	assert.Contains(t, w.Body.String(), "event: contest_update")
}

func TestStreamContest_HeartbeatsAndRevocationChecks(t *testing.T) {
	ch := make(chan service.Event)
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&service.Subscription{Events: ch, Stop: func() {}}, nil)
	checks := 0
	svc.EXPECT().IsRevoked(mock.Anything, "v@b.com", int64(1)).RunAndReturn(func(context.Context, string, int64) (bool, error) {
		checks++
		if checks == 1 {
			return false, errors.New("redis blip")
		}
		return true, nil
	})

	cfg := model.StreamConfig{HeartbeatInterval: 5 * time.Millisecond, RevocationInterval: 30 * time.Millisecond}
	w := serve(streamRouter(svc, cfg, nil, farFuture()), "/events/contests/"+uuid.NewString(), nil)

	assert.Contains(t, w.Body.String(), ": ping\n\n")
	assert.Equal(t, 2, checks, "a failed check keeps the stream open; a revoked token ends it")
}

func TestStreamContest_EndsWhenTheTokenExpires(t *testing.T) {
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&service.Subscription{Events: make(chan service.Event), Stop: func() {}}, nil)

	done := make(chan struct{})
	go func() {
		serve(streamRouter(svc, slowTimers, nil, time.Now().Add(-time.Minute).Unix()), "/events/contests/"+uuid.NewString(), nil)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("stream outlived the token")
	}
}

func TestStreamContest_EndsOnServerShutdown(t *testing.T) {
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&service.Subscription{Events: make(chan service.Event), Stop: func() {}}, nil)
	shutdown := make(chan struct{})
	close(shutdown)

	w := serve(streamRouter(svc, slowTimers, shutdown, farFuture()), "/events/contests/"+uuid.NewString(), nil)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestTokenLifetime(t *testing.T) {
	assert.Equal(t, time.Hour, tokenLifetime(nil))
	assert.Equal(t, time.Millisecond, tokenLifetime(&api.Claims{Expire: 1}))
	assert.InDelta(t, (10 * time.Minute).Seconds(), tokenLifetime(&api.Claims{Expire: time.Now().Add(10 * time.Minute).Unix()}).Seconds(), 2)
}

func TestWriteEvent(t *testing.T) {
	w := httptest.NewRecorder()
	require.NoError(t, writeEvent(w, "12-3", events.NewRevokedEvent(uuid.New())))

	assert.True(t, strings.HasPrefix(w.Body.String(), "id: 12-3\nevent: revoked\ndata: {"))
	assert.True(t, strings.HasSuffix(w.Body.String(), "}\n\n"))
}

func TestStreamContest_EndsWhenTheViewerFallsBehind(t *testing.T) {
	ch := make(chan service.Event)
	close(ch)
	svc := mocks.NewStreamService(t)
	svc.EXPECT().Subscribe(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&service.Subscription{Events: ch, Stop: func() {}}, nil)

	w := serve(streamRouter(svc, slowTimers, nil, farFuture()), "/events/contests/"+uuid.NewString(), nil)

	assert.Equal(t, http.StatusOK, w.Code, "the client reconnects with its Last-Event-ID")
}
