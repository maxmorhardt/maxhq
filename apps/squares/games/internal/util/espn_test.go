package util

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScoreboardToGames(t *testing.T) {
	var resp model.ScoreboardResponse
	require.NoError(t, json.Unmarshal([]byte(scoreboardJSON), &resp))

	games := ScoreboardToGames(&resp)

	require.Len(t, games, 1)
	g := games[0]
	assert.Equal(t, "401", g.ESPNID)
	assert.Equal(t, 2025, g.Season)
	assert.Equal(t, 2, g.SeasonType)
	assert.Equal(t, 18, g.Week)
	assert.Equal(t, 4, g.Period)
	assert.True(t, g.Completed)
	assert.Equal(t, "post", g.State)
	assert.Equal(t, "STATUS_FINAL", g.StatusName)

	assert.Equal(t, "Chiefs", g.HomeTeam)
	assert.Equal(t, "KC", g.HomeAbbr)
	assert.Equal(t, 24, g.HomeScore)
	assert.Equal(t, []int{7, 3, 7, 7}, g.HomeLine)

	assert.Equal(t, "Eagles", g.AwayTeam)
	assert.Equal(t, "PHI", g.AwayAbbr)
	assert.Equal(t, 20, g.AwayScore)
	assert.Equal(t, []int{3, 7, 3, 7}, g.AwayLine)

	assert.False(t, g.GameTime.IsZero())
}

func TestESPNGameToGame(t *testing.T) {
	eg := &model.ESPNGame{
		ESPNID:     "401",
		HomeTeam:   "Chiefs",
		AwayTeam:   "Eagles",
		HomeAbbr:   "KC",
		AwayAbbr:   "PHI",
		GameTime:   time.Date(2026, 1, 4, 18, 0, 0, 0, time.UTC),
		Week:       18,
		Season:     2025,
		SeasonType: 2,
		State:      "in",
		Period:     3,
		HomeScore:  17,
		AwayScore:  13,
	}

	g := ESPNGameToGame(eg)

	assert.Equal(t, "401", g.ESPNID)
	assert.Equal(t, "Chiefs", g.HomeTeam)
	assert.Equal(t, "PHI", g.AwayAbbr)
	assert.Equal(t, 18, g.Week)
	assert.Equal(t, model.GameStatusInProgress, g.Status)
	assert.Equal(t, 3, g.Period)
	assert.Equal(t, 17, g.HomeScore)
	assert.Equal(t, 13, g.AwayScore)
}

func TestCompletedQuarters_Completed(t *testing.T) {
	eg := &model.ESPNGame{
		Period:    4,
		Completed: true,
		HomeScore: 24,
		AwayScore: 20,
		HomeLine:  []int{7, 3, 7, 7},
		AwayLine:  []int{3, 7, 3, 7},
	}

	quarters := CompletedQuarters(eg)

	require.Len(t, quarters, 4)
	assert.Equal(t, model.QuarterScore{Quarter: 1, Home: 7, Away: 3}, quarters[0])
	assert.Equal(t, model.QuarterScore{Quarter: 2, Home: 10, Away: 10}, quarters[1])
	assert.Equal(t, model.QuarterScore{Quarter: 3, Home: 17, Away: 13}, quarters[2])
	assert.Equal(t, model.QuarterScore{Quarter: 4, Home: 24, Away: 20}, quarters[3])
}

func TestCompletedQuarters_InProgress(t *testing.T) {
	eg := &model.ESPNGame{
		Period:   3,
		HomeLine: []int{7, 3, 7},
		AwayLine: []int{3, 7, 0},
	}

	quarters := CompletedQuarters(eg)

	require.Len(t, quarters, 2)
	assert.Equal(t, model.QuarterScore{Quarter: 1, Home: 7, Away: 3}, quarters[0])
	assert.Equal(t, model.QuarterScore{Quarter: 2, Home: 10, Away: 10}, quarters[1])
}

func TestCompletedQuarters_Scheduled(t *testing.T) {
	assert.Empty(t, CompletedQuarters(&model.ESPNGame{}))
}

func TestCompletedQuarters_AtTheBreak(t *testing.T) {
	endOfFirst := &model.ESPNGame{Period: 1, StatusName: "STATUS_END_PERIOD", HomeLine: []int{7}, AwayLine: []int{3}}
	assert.Equal(t, []model.QuarterScore{{Quarter: 1, Home: 7, Away: 3}}, CompletedQuarters(endOfFirst))

	halftime := &model.ESPNGame{Period: 2, StatusName: "STATUS_HALFTIME", HomeLine: []int{7, 3}, AwayLine: []int{3, 7}}
	quarters := CompletedQuarters(halftime)
	require.Len(t, quarters, 2)
	assert.Equal(t, model.QuarterScore{Quarter: 2, Home: 10, Away: 10}, quarters[1])
}

func TestCompletedQuarters_EndOfRegulationWaitsForTheFinal(t *testing.T) {
	eg := &model.ESPNGame{Period: 4, StatusName: "STATUS_END_PERIOD", HomeLine: []int{7, 3, 7, 3}, AwayLine: []int{3, 7, 3, 7}}

	quarters := CompletedQuarters(eg)

	require.Len(t, quarters, 3)
	assert.Equal(t, 3, quarters[2].Quarter)
}

func TestCompletedQuarters_MidQuarter(t *testing.T) {
	eg := &model.ESPNGame{Period: 2, StatusName: "STATUS_IN_PROGRESS", HomeLine: []int{7, 3}, AwayLine: []int{3, 0}}

	assert.Equal(t, []model.QuarterScore{{Quarter: 1, Home: 7, Away: 3}}, CompletedQuarters(eg))
}

func TestGameStatus(t *testing.T) {
	cases := []struct {
		name string
		game model.ESPNGame
		want model.GameStatus
	}{
		{"scheduled", model.ESPNGame{State: "pre", StatusName: "STATUS_SCHEDULED"}, model.GameStatusScheduled},
		{"no state", model.ESPNGame{}, model.GameStatusScheduled},
		{"in progress", model.ESPNGame{State: "in", StatusName: "STATUS_IN_PROGRESS"}, model.GameStatusInProgress},
		{"halftime", model.ESPNGame{State: "in", StatusName: "STATUS_HALFTIME"}, model.GameStatusInProgress},
		{"final", model.ESPNGame{State: "post", StatusName: "STATUS_FINAL", Completed: true}, model.GameStatusFinal},
		{"postponed", model.ESPNGame{State: "post", StatusName: "STATUS_POSTPONED"}, model.GameStatusPostponed},
		{"postponed before the state moves", model.ESPNGame{State: "pre", StatusName: "STATUS_POSTPONED"}, model.GameStatusPostponed},
		{"stopped short without a name", model.ESPNGame{State: "post"}, model.GameStatusPostponed},
		{"canceled", model.ESPNGame{State: "post", StatusName: "STATUS_CANCELED"}, model.GameStatusCanceled},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, gameStatus(&tc.game))
		})
	}
}

func TestParseESPNTime(t *testing.T) {
	rfc := parseESPNTime("2026-01-04T18:00:00Z")
	assert.Equal(t, time.Date(2026, 1, 4, 18, 0, 0, 0, time.UTC), rfc.UTC())

	short := parseESPNTime("2026-01-04T18:00Z")
	assert.Equal(t, time.Date(2026, 1, 4, 18, 0, 0, 0, time.UTC), short.UTC())

	assert.True(t, parseESPNTime("not-a-time").IsZero())
}

const scoreboardJSON = `{
  "events": [
    {
      "id": "401",
      "date": "2026-01-04T18:00Z",
      "season": {"year": 2025, "type": 2},
      "week": {"number": 18},
      "competitions": [
        {
          "status": {"period": 4, "type": {"name": "STATUS_FINAL", "state": "post", "completed": true}},
          "competitors": [
            {"homeAway": "home", "score": "24", "team": {"displayName": "Chiefs", "abbreviation": "KC"},
             "linescores": [{"value": 7}, {"value": 3}, {"value": 7}, {"value": 7}]},
            {"homeAway": "away", "score": "20", "team": {"displayName": "Eagles", "abbreviation": "PHI"},
             "linescores": [{"value": 3}, {"value": 7}, {"value": 3}, {"value": 7}]}
          ]
        }
      ]
    },
    {"id": "empty", "competitions": []}
  ]
}`

func TestScoreboardToGames_SkipsGamesWithoutTeams(t *testing.T) {
	var resp model.ScoreboardResponse
	require.NoError(t, json.Unmarshal([]byte(`{"events": [{
		"id": "402", "season": {"year": 2026, "type": 3}, "week": {"number": 1},
		"competitions": [{"competitors": [
			{"homeAway": "home", "team": {"displayName": "TBD", "abbreviation": "TBD"}},
			{"homeAway": "away", "team": {"displayName": "TBD", "abbreviation": "TBD"}}
		]}]
	}]}`), &resp))

	assert.Empty(t, ScoreboardToGames(&resp))
}

func TestScoreboardCalendar(t *testing.T) {
	var resp model.ScoreboardResponse
	require.NoError(t, json.Unmarshal([]byte(`{"leagues": [{
		"season": {"year": 2026},
		"calendar": [
			{"value": "1", "entries": [{"value": "1", "label": "Hall of Fame Weekend", "startDate": "2026-08-06T07:00Z", "endDate": "2026-08-13T06:59Z"}]},
			{"value": "2", "entries": [{"value": "1"}, {"value": "x"}]},
			{"value": "3", "endDate": "2027-02-16T07:59Z", "entries": [{"value": "1"}]},
			{"value": "4", "entries": [{"value": "1"}]},
			{"value": "?", "entries": [{"value": "1"}]}
		]
	}]}`), &resp))

	cal := ScoreboardCalendar(&resp)

	assert.Equal(t, 2026, cal.Season)
	require.Len(t, cal.Weeks, 3)
	assert.Equal(t, model.SeasonWeek{
		Week:     model.Week{Season: 2026, SeasonType: 1, Week: 1},
		Label:    "Hall of Fame Weekend",
		StartsAt: time.Date(2026, 8, 6, 7, 0, 0, 0, time.UTC),
		EndsAt:   time.Date(2026, 8, 13, 6, 59, 0, 0, time.UTC),
	}, cal.Weeks[0])
	assert.Equal(t, "Week 1", cal.Weeks[1].Label, "a week ESPN does not name gets a default name")
	assert.Equal(t, model.Week{Season: 2026, SeasonType: 3, Week: 1}, cal.Weeks[2].Week)
	assert.Equal(t, time.Date(2027, 2, 16, 7, 59, 0, 0, time.UTC), cal.End.UTC())
	assert.Equal(t, model.ESPNCalendar{}, ScoreboardCalendar(&model.ScoreboardResponse{}))
}
