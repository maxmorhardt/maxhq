package integration

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type sseEvent struct {
	id    uint64
	kind  string
	event model.ContestEvent
}

type sseStream struct {
	events chan sseEvent
	cancel context.CancelFunc
	status int
}

// a minimal event-stream client, the same shape the frontend's fetch reader parses
func openStream(t *testing.T, user string, contestID uuid.UUID, lastEventID string) *sseStream {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, realtimeURL+"/events/contests/"+contestID.String(), http.NoBody)
	require.NoError(t, err)
	if lastEventID != "" {
		req.Header.Set("Last-Event-ID", lastEventID)
	}
	as(user).apply(req)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	s := &sseStream{events: make(chan sseEvent, 32), cancel: cancel, status: resp.StatusCode}
	t.Cleanup(func() {
		cancel()
		_ = resp.Body.Close()
	})
	if resp.StatusCode != http.StatusOK {
		close(s.events)
		return s
	}

	go func() {
		defer close(s.events)
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
		var current sseEvent
		for scanner.Scan() {
			line := scanner.Text()
			switch {
			case strings.HasPrefix(line, "id: "):
				current.id, _ = strconv.ParseUint(strings.TrimPrefix(line, "id: "), 10, 64)
			case strings.HasPrefix(line, "event: "):
				current.kind = strings.TrimPrefix(line, "event: ")
			case strings.HasPrefix(line, "data: "):
				_ = json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &current.event)
			case line == "" && current.kind != "":
				s.events <- current
				current = sseEvent{}
			}
		}
	}()

	return s
}

func (s *sseStream) next(t *testing.T) sseEvent {
	t.Helper()
	select {
	case e, ok := <-s.events:
		require.True(t, ok, "stream ended early")
		return e
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for an event")
		return sseEvent{}
	}
}

func claim(t *testing.T, user string, contestID, squareID uuid.UUID) {
	t.Helper()
	resp := call(t, contestsURL, as(user), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), nil)
	require.Equal(t, http.StatusOK, resp.status, string(resp.body))
}

func TestRealtime_SnapshotThenLiveEvents(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Stream Bowl", 100)
	require.Equal(t, http.StatusOK, resp.status)
	squares := snapshot(t, ownerUser, contest.ID).Contest.Squares

	stream := openStream(t, ownerUser, contest.ID, "")
	require.Equal(t, http.StatusOK, stream.status)

	connected := stream.next(t)
	assert.Equal(t, model.ConnectedType, connected.kind)
	require.NotNil(t, connected.event.Contest)
	assert.Equal(t, contest.ID, connected.event.Contest.ID)

	claim(t, ownerUser, contest.ID, squares[0].ID)

	update := stream.next(t)
	assert.Equal(t, model.SquareUpdateType, update.kind)
	assert.Greater(t, update.id, connected.id, "ids are stream sequences, so they only grow")
	require.NotNil(t, update.event.Square)
	assert.Equal(t, squares[0].ID, update.event.Square.ID)
	assert.Equal(t, int64(2), update.event.Square.Version)
}

func TestRealtime_ResumeReplaysMissedEventsWithoutASnapshot(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Resume Bowl", 100)
	require.Equal(t, http.StatusOK, resp.status)
	squares := snapshot(t, ownerUser, contest.ID).Contest.Squares

	first := openStream(t, ownerUser, contest.ID, "")
	first.next(t)
	claim(t, ownerUser, contest.ID, squares[0].ID)
	seen := first.next(t)
	first.cancel()

	// these happen while the client is offline
	claim(t, ownerUser, contest.ID, squares[1].ID)
	claim(t, ownerUser, contest.ID, squares[2].ID)

	resumed := openStream(t, ownerUser, contest.ID, strconv.FormatUint(seen.id, 10))
	missed := []uuid.UUID{resumed.next(t).event.Square.ID, resumed.next(t).event.Square.ID}

	assert.Equal(t, []uuid.UUID{squares[1].ID, squares[2].ID}, missed)
}

func TestRealtime_RejectsViewersWithoutAccess(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Private Bowl", 10)
	require.Equal(t, http.StatusOK, resp.status)

	assert.Equal(t, http.StatusForbidden, openStream(t, "stranger@squares.test", contest.ID, "").status)
	assert.Equal(t, http.StatusNotFound, openStream(t, ownerUser, uuid.New(), "").status)
}

func TestRealtime_RemovedParticipantIsRevoked(t *testing.T) {
	contest, resp := createContest(t, ownerUser, "Kick Bowl", 50)
	require.Equal(t, http.StatusOK, resp.status)
	invite := call(t, contestsURL, as(ownerUser), http.MethodPost, "/contests/"+contest.ID.String()+"/invites",
		model.CreateInviteRequest{MaxSquares: 10, Role: "participant"})
	require.Equal(t, http.StatusOK, invite.status)
	var created model.ContestInvite
	invite.decode(t, &created)
	require.Equal(t, http.StatusCreated, call(t, contestsURL, as("kicked@squares.test"), http.MethodPost, "/invites/"+created.Token+"/redeem", nil).status)

	stream := openStream(t, "kicked@squares.test", contest.ID, "")
	stream.next(t)

	require.Equal(t, http.StatusNoContent, call(t, contestsURL, as(ownerUser), http.MethodDelete,
		"/contests/"+contest.ID.String()+"/participants/kicked@squares.test", nil).status)

	assert.Equal(t, model.RevokedType, stream.next(t).kind)
}
