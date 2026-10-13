package e2e

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/libs/go/platform/testkit"
	"github.com/stretchr/testify/require"
)

// only the fields these tests read; the services own the full shapes
type square struct {
	ID      uuid.UUID `json:"id"`
	Value   string    `json:"value"`
	Owner   string    `json:"owner"`
	Version int64     `json:"version"`
}

type contest struct {
	ID             uuid.UUID         `json:"id"`
	Status         string            `json:"status"`
	HomeTeam       string            `json:"homeTeam"`
	Owner          string            `json:"owner"`
	Squares        []square          `json:"squares"`
	QuarterResults []json.RawMessage `json:"quarterResults"`
}

type snapshotBody struct {
	Contest      contest           `json:"contest"`
	Participants []json.RawMessage `json:"participants"`
}

func createContest(t *testing.T, owner, name string, maxSquares int) contest {
	t.Helper()
	body := map[string]any{"owner": owner, "name": name, "homeTeam": "Chiefs", "awayTeam": "Eagles", "maxSquares": maxSquares}
	resp := testkit.Call(t, contestsURL, testkit.As(owner), http.MethodPut, "/contests", body)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var c contest
	resp.Decode(t, &c)
	return c
}

// the internal snapshot, read the way realtime reads it
func snapshot(t *testing.T, user string, contestID uuid.UUID) snapshotBody {
	t.Helper()
	resp := testkit.Call(t, contestsURL, testkit.Anonymous, http.MethodGet,
		fmt.Sprintf("/internal/contests/%s/snapshot?user=%s", contestID, user), nil, "X-Internal-Token", internalToken)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
	var snap snapshotBody
	resp.Decode(t, &snap)
	return snap
}

func claim(t *testing.T, user string, contestID, squareID uuid.UUID) {
	t.Helper()
	resp := testkit.Call(t, contestsURL, testkit.As(user), http.MethodPost, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), nil)
	require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
}

func signIn(t *testing.T, user string) {
	t.Helper()
	require.Equal(t, http.StatusOK, testkit.Call(t, accountsURL, testkit.As(user), http.MethodGet, "/users/me", nil).Status)
}

func watch(t *testing.T, user string, contestID uuid.UUID, lastEventID string) *testkit.Stream {
	t.Helper()
	return testkit.OpenStream(t, realtimeURL+"/events/contests/"+contestID.String(), testkit.As(user), lastEventID)
}

// reads events until one of kind arrives
func nextOfKind(t *testing.T, s *testkit.Stream, kind string) testkit.Event {
	t.Helper()
	deadline := time.Now().Add(eventually)
	for time.Now().Before(deadline) {
		if e := s.Next(t); e.Kind == kind {
			return e
		}
	}
	t.Fatalf("no %s event", kind)
	return testkit.Event{}
}

// an espn scoreboard the tests rewrite as games progress
type fakeESPN struct {
	mu    sync.Mutex
	games map[string]fakeGame
}

type fakeGame struct {
	ID       string
	Kickoff  time.Time
	State    string // pre, in, post
	Period   int
	Home     string
	Away     string
	HomeLine []int
	AwayLine []int
}

func startESPN() *httptest.Server {
	espn.games = map[string]fakeGame{}
	return httptest.NewServer(espn)
}

func (f *fakeESPN) set(g *fakeGame) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.games[g.ID] = *g
}

func (f *fakeESPN) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	type line struct {
		Value int `json:"value"`
	}
	competitor := func(side, name string, lines []int) map[string]any {
		total, ls := 0, make([]line, 0, len(lines))
		for _, v := range lines {
			total += v
			ls = append(ls, line{Value: v})
		}
		return map[string]any{
			"homeAway": side, "score": fmt.Sprint(total), "linescores": ls,
			"team": map[string]string{"displayName": name, "abbreviation": name[:3]},
		}
	}

	events := make([]map[string]any, 0, len(f.games))
	for id := range f.games {
		g := f.games[id]
		events = append(events, map[string]any{
			"id":     g.ID,
			"date":   g.Kickoff.UTC().Format("2006-01-02T15:04Z"),
			"season": map[string]int{"year": 2026, "type": 2},
			"week":   map[string]int{"number": 1},
			"competitions": []map[string]any{{
				"status": map[string]any{"period": g.Period, "type": map[string]any{"state": g.State, "completed": g.State == "post"}},
				"competitors": []map[string]any{
					competitor("home", g.Home, g.HomeLine),
					competitor("away", g.Away, g.AwayLine),
				},
			}},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"events": events})
}
