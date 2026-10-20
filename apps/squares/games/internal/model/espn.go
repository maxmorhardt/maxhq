package model

import (
	"time"
)

type ESPNGame struct {
	ESPNID     string
	HomeTeam   string
	AwayTeam   string
	HomeAbbr   string
	AwayAbbr   string
	GameTime   time.Time
	Week       int
	Season     int
	SeasonType int
	State      string
	Period     int
	Completed  bool
	HomeScore  int
	AwayScore  int
	HomeLine   []int
	AwayLine   []int
}

type QuarterScore struct {
	Quarter int
	Home    int
	Away    int
}

// the season's weeks as ESPN lists them, and when its postseason ends
type ESPNCalendar struct {
	Season int
	Weeks  []Week
	End    time.Time
}

type GameActivity struct {
	Live        bool
	NextKickoff time.Time
}

type ScoreboardResponse struct {
	Events  []scoreboardEvent  `json:"events"`
	Leagues []scoreboardLeague `json:"leagues"`
}

type scoreboardLeague struct {
	Season struct {
		Year int `json:"year"`
	} `json:"season"`
	Calendar []scoreboardCalendar `json:"calendar"`
}

// one season phase (1 preseason, 2 regular season, 3 postseason, 4 off season) and its weeks
type scoreboardCalendar struct {
	Value   string `json:"value"`
	EndDate string `json:"endDate"`
	Entries []struct {
		Value string `json:"value"`
	} `json:"entries"`
}

type scoreboardEvent struct {
	ID     string `json:"id"`
	Date   string `json:"date"`
	Season struct {
		Year int `json:"year"`
		Type int `json:"type"`
	} `json:"season"`
	Week struct {
		Number int `json:"number"`
	} `json:"week"`
	Competitions []struct {
		Status      scoreboardStatus      `json:"status"`
		Competitors []scoreboardTeamScore `json:"competitors"`
	} `json:"competitions"`
}

type scoreboardStatus struct {
	Period int `json:"period"`
	Type   struct {
		State     string `json:"state"`
		Completed bool   `json:"completed"`
	} `json:"type"`
}

type scoreboardTeamScore struct {
	HomeAway string `json:"homeAway"`
	Score    string `json:"score"`
	Team     struct {
		DisplayName  string `json:"displayName"`
		Abbreviation string `json:"abbreviation"`
	} `json:"team"`
	LineScores []struct {
		Value float64 `json:"value"`
	} `json:"linescores"`
}
