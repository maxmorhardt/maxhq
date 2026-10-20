package integration

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/bootstrap"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/config"
	"github.com/maxmorhardt/maxhq/libs/platform/middleware"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const internalToken = "integration-internal-token"

var (
	realtimeURL string
	rdb         *redis.Client
	contests    = &fakeContests{members: map[uuid.UUID]map[string]bool{}}
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	rd, err := testkit.StartRedis(ctx)
	if err != nil {
		slog.Error("redis", "error", err)
		return 1
	}
	defer rd.Terminate()

	contestsSrv := httptest.NewServer(contests)
	defer contestsSrv.Close()

	cfg := &model.RealtimeConfig{
		Server:   config.ServerConfig{AllowedOrigins: []string{"http://localhost:3000"}},
		Redis:    rd.Config,
		Internal: config.InternalConfig{Token: internalToken},
		Contests: model.ContestsConfig{URL: contestsSrv.URL},
		Stream:   model.StreamConfig{HeartbeatInterval: 25 * time.Second, RevocationInterval: time.Minute},
	}
	infra, err := bootstrap.Connect(cfg)
	if err != nil {
		slog.Error("connect", "error", err)
		return 1
	}
	defer infra.Close()
	rdb = infra.Redis

	app := bootstrap.New(cfg, infra, ctx.Done())
	app.Start(ctx)
	srv := httptest.NewServer(app.Engine)
	defer srv.Close()
	realtimeURL = srv.URL

	return m.Run()
}

type fakeContests struct {
	mu      sync.Mutex
	members map[uuid.UUID]map[string]bool
}

func (f *fakeContests) setMembers(contestID uuid.UUID, users ...string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.members[contestID] = map[string]bool{}
	for _, u := range users {
		f.members[contestID][u] = true
	}
}

func (f *fakeContests) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get(middleware.HeaderInternalToken) != internalToken {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	id, err := uuid.Parse(strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/internal/contests/"), "/snapshot"))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	f.mu.Lock()
	members, ok := f.members[id]
	allowed := members[r.URL.Query().Get("user")]
	f.mu.Unlock()

	switch {
	case !ok:
		w.WriteHeader(http.StatusNotFound)
	case !allowed:
		w.WriteHeader(http.StatusForbidden)
	default:
		_, _ = w.Write([]byte(`{"contest":{"id":"` + id.String() + `","name":"Stream Bowl"},"participants":[]}`))
	}
}

func publish(t *testing.T, contestID uuid.UUID, eventType string, payload any) string {
	t.Helper()
	event, err := events.NewContestEvent(eventType, contestID, "u", payload)
	require.NoError(t, err)
	data, err := json.Marshal(event)
	require.NoError(t, err)
	id, err := rdb.XAdd(context.Background(), &redis.XAddArgs{
		Stream: streams.Key(events.ContestStream(contestID)),
		Values: []string{"type", eventType, "data", string(data), "event_id", uuid.NewString()},
	}).Result()
	require.NoError(t, err)
	return id
}

func open(t *testing.T, user string, contestID uuid.UUID, lastEventID string) *testkit.Stream {
	t.Helper()
	return testkit.OpenStream(t, realtimeURL+"/events/contests/"+contestID.String(), testkit.As(user), lastEventID)
}

func TestRealtime_SnapshotThenLiveEvents(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "v@squares.test")
	before := publish(t, contestID, events.SquareUpdatedType, nil)

	stream := open(t, "v@squares.test", contestID, "")
	require.Equal(t, http.StatusOK, stream.Status)

	connected := stream.Next(t)
	assert.Equal(t, events.ContestSnapshotType, connected.Kind)
	assert.Equal(t, before, connected.ID, "the snapshot covers everything already in the stream")
	var body struct {
		Data struct {
			Contest struct {
				Name string `json:"name"`
			} `json:"contest"`
		} `json:"data"`
	}
	connected.Decode(t, &body)
	assert.Equal(t, "Stream Bowl", body.Data.Contest.Name, "the snapshot is passed through from contests")

	live := publish(t, contestID, events.ContestUpdatedType, nil)
	update := stream.Next(t)
	assert.Equal(t, events.ContestUpdatedType, update.Kind)
	assert.Equal(t, live, update.ID)
}

func TestRealtime_ResumeReplaysOnlyWhatWasMissed(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "v@squares.test")
	seen := publish(t, contestID, events.SquareUpdatedType, nil)
	missed1 := publish(t, contestID, events.SquareUpdatedType, nil)
	missed2 := publish(t, contestID, events.ParticipantJoinedType, nil)

	stream := open(t, "v@squares.test", contestID, seen)

	assert.Equal(t, missed1, stream.Next(t).ID, "no snapshot when nothing was lost")
	assert.Equal(t, missed2, stream.Next(t).ID)
	live := publish(t, contestID, events.SquareUpdatedType, nil)
	assert.Equal(t, live, stream.Next(t).ID)
}

func TestRealtime_TrimmedPositionGetsASnapshot(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "v@squares.test")
	publish(t, contestID, events.SquareUpdatedType, nil)

	stream := open(t, "v@squares.test", contestID, "1-0")

	assert.Equal(t, events.ContestSnapshotType, stream.Next(t).Kind)
}

func TestRealtime_RejectsViewersWithoutAccess(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "v@squares.test")

	assert.Equal(t, http.StatusForbidden, open(t, "stranger@squares.test", contestID, "").Status)
	assert.Equal(t, http.StatusNotFound, open(t, "v@squares.test", uuid.New(), "").Status)
	assert.Equal(t, http.StatusUnauthorized, testkit.OpenStream(t, realtimeURL+"/events/contests/"+contestID.String(), testkit.Anonymous, "").Status)
	assert.Equal(t, http.StatusBadRequest, open(t, "v@squares.test", contestID, "41").Status, "ids are <ms>-<seq>")
}

func TestRealtime_RemovedViewerIsRevoked(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "owner@squares.test", "kicked@squares.test")
	stream := open(t, "kicked@squares.test", contestID, "")
	stream.Next(t)

	contests.setMembers(contestID, "owner@squares.test")
	publish(t, contestID, events.ParticipantRemovedType, events.AccessFields{UserID: "kicked@squares.test"})

	assert.Equal(t, events.AccessRevokedType, stream.Next(t).Kind)
	assert.True(t, stream.Ended(5*time.Second))
}

func TestRealtime_ViewersOfOneContestAllReceiveEachEvent(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "a@squares.test", "b@squares.test")
	a := open(t, "a@squares.test", contestID, "")
	b := open(t, "b@squares.test", contestID, "")
	a.Next(t)
	b.Next(t)

	id := publish(t, contestID, events.SquareUpdatedType, nil)

	assert.Equal(t, id, a.Next(t).ID)
	assert.Equal(t, id, b.Next(t).ID)
}

func TestRealtime_DeletedContestEndsTheStream(t *testing.T) {
	contestID := uuid.New()
	contests.setMembers(contestID, "v@squares.test")
	stream := open(t, "v@squares.test", contestID, "")
	stream.Next(t)

	publish(t, contestID, events.ContestDeletedType, nil)

	assert.Equal(t, events.ContestDeletedType, stream.Next(t).Kind)
	assert.True(t, stream.Ended(5*time.Second))
}
