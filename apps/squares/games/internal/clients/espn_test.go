package clients

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const scoreboardBody = `{
  "events": [{
    "id": "401",
    "date": "2025-09-05T00:20Z",
    "season": {"year": 2025, "type": 2},
    "week": {"number": 1},
    "competitions": [{
      "status": {"period": 2, "type": {"state": "in", "completed": false}},
      "competitors": [
        {"homeAway": "home", "score": "10", "team": {"displayName": "Chiefs", "abbreviation": "KC"}, "linescores": [{"value": 7}, {"value": 3}]},
        {"homeAway": "away", "score": "7", "team": {"displayName": "Eagles", "abbreviation": "PHI"}, "linescores": [{"value": 0}, {"value": 7}]}
      ]
    }]
  }],
  "leagues": [{
    "season": {"year": 2025},
    "calendar": [
      {"value": "2", "endDate": "2026-01-08T07:59Z", "entries": [{"value": "1"}, {"value": "2"}]},
      {"value": "3", "endDate": "2026-02-10T07:59Z", "entries": [{"value": "1"}]},
      {"value": "4", "entries": []}
    ]
  }]
}`

func serve(t *testing.T, status int, seen *url.Values) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if seen != nil {
			*seen = r.URL.Query()
		}
		assert.Equal(t, userAgent, r.Header.Get("User-Agent"))
		w.WriteHeader(status)
		if status == http.StatusOK {
			_, _ = w.Write([]byte(scoreboardBody))
		}
	}))
	t.Cleanup(server.Close)
	return server
}

func TestESPNClient_FetchCurrent(t *testing.T) {
	var query url.Values
	games, cal, err := NewESPNClient(serve(t, http.StatusOK, &query).URL).FetchCurrent(context.Background())
	require.NoError(t, err)

	assert.False(t, query.Has("dates"), "the current scoreboard takes no dates")
	require.Len(t, games, 1)
	g := games[0]
	assert.Equal(t, "401", g.ESPNID)
	assert.Equal(t, "Chiefs", g.HomeTeam)
	assert.Equal(t, "Eagles", g.AwayTeam)
	assert.Equal(t, 10, g.HomeScore)
	assert.Equal(t, "in", g.State)
	assert.Equal(t, 2, g.Period)

	assert.Equal(t, 2025, cal.Season)
	weeks := make([]model.Week, 0, len(cal.Weeks))
	for i := range cal.Weeks {
		weeks = append(weeks, cal.Weeks[i].Week)
	}
	assert.Equal(t, []model.Week{
		{Season: 2025, SeasonType: 2, Week: 1},
		{Season: 2025, SeasonType: 2, Week: 2},
		{Season: 2025, SeasonType: 3, Week: 1},
	}, weeks)
	assert.Equal(t, 2026, cal.End.Year())
	assert.Equal(t, 2, int(cal.End.Month()))
}

func TestESPNClient_FetchWeek(t *testing.T) {
	var query url.Values
	_, _, err := NewESPNClient(serve(t, http.StatusOK, &query).URL).
		FetchWeek(context.Background(), model.Week{Season: 2026, SeasonType: 3, Week: 2})
	require.NoError(t, err)

	assert.Equal(t, "2026", query.Get("dates"))
	assert.Equal(t, "3", query.Get("seasontype"))
	assert.Equal(t, "2", query.Get("week"))
}

func TestESPNClient_BadStatus(t *testing.T) {
	_, _, err := NewESPNClient(serve(t, http.StatusBadRequest, nil).URL).
		FetchWeek(context.Background(), model.Week{Season: 2026, SeasonType: 2, Week: 1})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "400")
}
