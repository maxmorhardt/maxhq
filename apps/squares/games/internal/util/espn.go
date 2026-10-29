package util

import (
	"strconv"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
)

const (
	statusEndPeriod = "STATUS_END_PERIOD"
	statusHalftime  = "STATUS_HALFTIME"
	statusPostponed = "STATUS_POSTPONED"
	statusCanceled  = "STATUS_CANCELED"
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
			StatusName: comp.Status.Type.Name,
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

		// postseason games are listed before their matchups are set
		if !knownTeam(g.HomeAbbr) || !knownTeam(g.AwayAbbr) {
			continue
		}

		games = append(games, g)
	}

	return games
}

func knownTeam(abbr string) bool {
	return abbr != "" && abbr != "TBD"
}

// the preseason, regular season, and postseason weeks of the season the response belongs to
func ScoreboardCalendar(r *model.ScoreboardResponse) model.ESPNCalendar {
	if len(r.Leagues) == 0 {
		return model.ESPNCalendar{}
	}
	league := r.Leagues[0]

	cal := model.ESPNCalendar{Season: league.Season.Year}
	for _, phase := range league.Calendar {
		seasonType, err := strconv.Atoi(phase.Value)
		if err != nil || seasonType < 1 || seasonType > 3 {
			continue
		}
		for _, entry := range phase.Entries {
			week, err := strconv.Atoi(entry.Value)
			if err != nil {
				continue
			}
			w := model.SeasonWeek{
				Week:     model.Week{Season: cal.Season, SeasonType: seasonType, Week: week},
				Label:    entry.Label,
				StartsAt: parseESPNTime(entry.StartDate),
				EndsAt:   parseESPNTime(entry.EndDate),
			}
			if w.Label == "" {
				w.Label = w.DefaultLabel()
			}
			cal.Weeks = append(cal.Weeks, w)
		}
		if seasonType == 3 {
			cal.End = parseESPNTime(phase.EndDate)
		}
	}

	return cal
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
		Status:     gameStatus(e),
		Period:     e.Period,
		HomeScore:  e.HomeScore,
		AwayScore:  e.AwayScore,
	}
}

func CompletedQuarters(e *model.ESPNGame) []model.QuarterScore {
	out := make([]model.QuarterScore, 0, 4)

	homeTotal, awayTotal := 0, 0
	n := min(len(e.HomeLine), len(e.AwayLine))
	for q := 1; q <= 3 && q-1 < n; q++ {
		homeTotal += e.HomeLine[q-1]
		awayTotal += e.AwayLine[q-1]
		if e.Period > q || e.Completed || (e.Period == q && atBreak(e.StatusName)) {
			out = append(out, model.QuarterScore{Quarter: q, Home: homeTotal, Away: awayTotal})
		}
	}

	// use the final score for Q4 so it reflects any overtime, not just the fourth period
	if e.Completed {
		out = append(out, model.QuarterScore{Quarter: 4, Home: e.HomeScore, Away: e.AwayScore})
	}

	return out
}

// a period's score is settled once ESPN calls the end of it, before the next one kicks off
func atBreak(statusName string) bool {
	return statusName == statusEndPeriod || statusName == statusHalftime
}

// ESPN puts postponed and canceled games in the "post" state too, so only a completed one is final;
// anything else that stopped short is waiting to be played, until ESPN calls it canceled
func gameStatus(e *model.ESPNGame) model.GameStatus {
	switch {
	case e.StatusName == statusCanceled:
		return model.GameStatusCanceled
	case e.State == "post" && e.Completed:
		return model.GameStatusFinal
	case e.State == "post" || e.StatusName == statusPostponed:
		return model.GameStatusPostponed
	case e.State == "in":
		return model.GameStatusInProgress
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
