package model

import (
	"time"

	"github.com/google/uuid"
)

type ContestSwagger struct {
	ID             uuid.UUID       `json:"id"`
	Name           string          `json:"name"`
	XLabels        []int8          `json:"xLabels"`
	YLabels        []int8          `json:"yLabels"`
	HomeTeam       string          `json:"homeTeam,omitempty"`
	AwayTeam       string          `json:"awayTeam,omitempty"`
	Squares        []Square        `json:"squares"`
	QuarterResults []QuarterResult `json:"quarterResults,omitempty"`
	Owner          string          `json:"owner"`
	Status         string          `json:"status"`
	Version        int64           `json:"version"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
}

type ContestSnapshotSwagger struct {
	Contest      ContestSwagger  `json:"contest"`
	Players      []ContestPlayer `json:"players"`
	Participants []ContestPlayer `json:"participants"`
	ViewerID     string          `json:"viewerId" example:"u_3q2mL0x9VfTzQk1rB7cW8a"`
}
