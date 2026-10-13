package util

import (
	"strconv"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
)

func ScoreboardToGames(r *model.ScoreboardResponse) []model.ESPNGame {
	games := make([]model.ESPNGame, 0, len(r.Events))
	for _, e := range r.Events {
		if len(e.Competitions) == 0 {
			continue
		}
		comp := e.Competitions[0]

		g := model.ESPNGame{
			ESPNID:     e.ID,
			GameTime:   parseESPNTime(e.Date),
			Week:       e.Week.Number,
			Season:     e.Season.Year,
			SeasonType: e.Season.Type,
			State:      comp.Status.Type.State,
			Period:     comp.Status.Period,
			Completed:  comp.Status.Type.Completed,
		}

		for _, c := range comp.Competitors {
			score, _ := strconv.Atoi(c.Score)
			line := make([]int, 0, len(c.LineScores))
			for _, ls := range c.LineScores {
				line = append(line, int(ls.Value))
			}

			if c.HomeAway == "home" {
				g.HomeTeam = c.Team.DisplayName
				g.HomeAbbr = c.Team.Abbreviation
				g.HomeScore = score
				g.HomeLine = line
			} else {
				g.AwayTeam = c.Team.DisplayName
				g.AwayAbbr = c.Team.Abbreviation
				g.AwayScore = score
				g.AwayLine = line
			}
		}

		games = append(games, g)
	}

	return games
}

func ESPNGameToGame(e *model.ESPNGame) *model.Game {
	return &model.Game{
		ESPNID:     e.ESPNID,
		HomeTeam:   e.HomeTeam,
		AwayTeam:   e.AwayTeam,
		HomeAbbr:   e.HomeAbbr,
		AwayAbbr:   e.AwayAbbr,
		GameTime:   e.GameTime,
		Week:       e.Week,
		Season:     e.Season,
		SeasonType: e.SeasonType,
		Status:     gameStatusFromState(e.State),
		Period:     e.Period,
		HomeScore:  e.HomeScore,
		AwayScore:  e.AwayScore,
	}
}

func CompletedQuarters(e *model.ESPNGame) []model.QuarterScore {
	out := make([]model.QuarterScore, 0, 4)

	// accumulate the running totals squares are scored against
	homeTotal, awayTotal := 0, 0
	n := min(len(e.HomeLine), len(e.AwayLine))
	for q := 1; q <= 3 && q-1 < n; q++ {
		// sum each quarter's line score into the cumulative total
		homeTotal += e.HomeLine[q-1]
		awayTotal += e.AwayLine[q-1]
		// only count a quarter once play has moved past it or the game is over
		if e.Period > q || e.Completed {
			out = append(out, model.QuarterScore{Quarter: q, Home: homeTotal, Away: awayTotal})
		}
	}

	// use the final score for Q4 so it reflects any overtime, not just the fourth period
	if e.Completed {
		out = append(out, model.QuarterScore{Quarter: 4, Home: e.HomeScore, Away: e.AwayScore})
	}

	return out
}

func gameStatusFromState(state string) model.GameStatus {
	switch state {
	case "in":
		return model.GameStatusInProgress
	case "post":
		return model.GameStatusFinal
	default:
		return model.GameStatusScheduled
	}
}

func parseESPNTime(s string) time.Time {
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04Z07:00"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}
