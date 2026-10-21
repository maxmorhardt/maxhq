package model

// Week identifies one week of one NFL season phase (preseason, regular season, or postseason)
type Week struct {
	Season     int `json:"season"`
	SeasonType int `json:"seasonType"`
	Week       int `json:"week"`
}

type Scoreboard struct {
	Week
	Games []Game `json:"games"`
}
