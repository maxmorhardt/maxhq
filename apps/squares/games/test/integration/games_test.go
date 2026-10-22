package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/platform/testkit"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func latestGameEvent(t *testing.T, espnID string) *events.Game {
	t.Helper()
	entries, err := streams.Range(context.Background(), rdb, events.GamesStream, "", 1000)
	require.NoError(t, err)

	var latest *events.Game
	for _, e := range entries {
		require.Equal(t, events.GameUpdatedType, e.Type)
		var event events.GameUpdated
		require.NoError(t, json.Unmarshal(e.Data, &event))
		if event.Game.ESPNID == espnID {
			latest = &event.Game
		}
	}
	return latest
}

func TestGames_ScheduleIsIngestedAndPublished(t *testing.T) {
	kickoff := time.Now().Add(48 * time.Hour).Truncate(time.Minute)
	espn.set(fakeGame{ID: "401-sched", Kickoff: kickoff, State: "pre", Home: "Lions", Away: "Bears"})

	var game *events.Game
	require.Eventually(t, func() bool {
		game = latestGameEvent(t, "401-sched")
		return game != nil
	}, eventually, 100*time.Millisecond, "the worker publishes every game it stores")

	assert.Equal(t, "Lions", game.HomeTeam)
	assert.Equal(t, events.GameStatusScheduled, game.Status)
	assert.True(t, game.GameTime.Equal(kickoff))

	resp := testkit.Call(t, gamesURL, testkit.As("fan@squares.test"), http.MethodGet, "/games/upcoming", nil)
	require.Equal(t, http.StatusOK, resp.Status)
	assert.Contains(t, string(resp.Body), "401-sched")
}

func TestGames_LiveScoresArePublishedOncePerChange(t *testing.T) {
	kickoff := time.Now().Add(-time.Hour)
	espn.set(fakeGame{ID: "401-live", Kickoff: kickoff, State: "in", Period: 2, Home: "Chiefs", Away: "Eagles", HomeLine: []int{7}, AwayLine: []int{3}})

	require.Eventually(t, func() bool {
		g := latestGameEvent(t, "401-live")
		return g != nil && len(g.Scores) == 1
	}, eventually, 100*time.Millisecond, "a completed quarter is published with the game")

	g := latestGameEvent(t, "401-live")
	assert.Equal(t, events.GameStatusInProgress, g.Status)
	assert.Equal(t, 1, g.Scores[0].Quarter)
	assert.Equal(t, 7, g.Scores[0].HomeScore)
	assert.Equal(t, 3, g.Scores[0].AwayScore)

	byID := testkit.Call(t, gamesURL, testkit.Anonymous, http.MethodGet, "/games/"+g.ID.String(), nil)
	require.Equal(t, http.StatusOK, byID.Status, "anyone can read a game")
	var served events.Game
	byID.Decode(t, &served)
	assert.Equal(t, g.ID, served.ID)
	assert.Len(t, served.Scores, 1)

	countFor := func() int {
		entries, err := streams.Range(context.Background(), rdb, events.GamesStream, "", 1000)
		require.NoError(t, err)
		n := 0
		for _, e := range entries {
			var event events.GameUpdated
			require.NoError(t, json.Unmarshal(e.Data, &event))
			if event.Game.ESPNID == "401-live" {
				n++
			}
		}
		return n
	}
	before := countFor()
	time.Sleep(time.Second)
	assert.Equal(t, before, countFor())
}

func TestGames_RequiresGatewayIdentity(t *testing.T) {
	resp := testkit.Call(t, gamesURL, testkit.Anonymous, http.MethodGet, "/games/upcoming", nil)

	assert.Equal(t, http.StatusUnauthorized, resp.Status)
}

func TestGames_OutboxIsDrained(t *testing.T) {
	require.Eventually(t, func() bool {
		var pending int
		require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM games.outbox WHERE published_at IS NULL`).Scan(&pending))
		return pending == 0
	}, eventually, 100*time.Millisecond)
}

func TestGames_ScoreboardFollowsTheCalendar(t *testing.T) {
	var board struct {
		Season     int    `json:"season"`
		SeasonType int    `json:"seasonType"`
		Week       int    `json:"week"`
		Label      string `json:"label"`
	}
	require.Eventually(t, func() bool {
		resp := testkit.Call(t, gamesURL, testkit.Anonymous, http.MethodGet, "/games/scoreboard", nil)
		if resp.Status != http.StatusOK {
			return false
		}
		resp.Decode(t, &board)
		return board.Label == "Week 1"
	}, eventually, 100*time.Millisecond, "the season sync saves the calendar and the scoreboard names the week")

	assert.Equal(t, 2026, board.Season)
	assert.Equal(t, 2, board.SeasonType)
	assert.Equal(t, 1, board.Week)
}
