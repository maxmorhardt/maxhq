package model

import (
	"fmt"
	"time"
)

// one week of one NFL season phase (preseason, regular season, or postseason)
type Week struct {
	Season     int `json:"season"`
	SeasonType int `json:"seasonType"`
	Week       int `json:"week"`
}

// one week of ESPN's season calendar: its name and when it runs
type SeasonWeek struct {
	Week     `gorm:"embedded"`
	Label    string    `json:"label"`
	StartsAt time.Time `json:"startsAt"`
	EndsAt   time.Time `json:"endsAt"`
}

func (SeasonWeek) TableName() string { return "season_weeks" }

// names a week the calendar does not list
func (w Week) DefaultLabel() string {
	switch w.SeasonType {
	case 1:
		return fmt.Sprintf("Preseason Week %d", w.Week)
	case 3:
		return fmt.Sprintf("Postseason Week %d", w.Week)
	default:
		return fmt.Sprintf("Week %d", w.Week)
	}
}

type Scoreboard struct {
	Week
	Label string `json:"label"`
	// the calendar weeks either side, across season phases and seasons; absent at the ends
	Previous *Week  `json:"previous,omitempty"`
	Next     *Week  `json:"next,omitempty"`
	Games    []Game `json:"games"`
}
