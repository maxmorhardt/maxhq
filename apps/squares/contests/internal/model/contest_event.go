package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ContestUpdate is the contest.updated payload: the contest without its squares, results, or game
type ContestUpdate struct {
	Name       string            `json:"name"`
	HomeTeam   string            `json:"homeTeam"`
	AwayTeam   string            `json:"awayTeam"`
	XLabels    datatypes.JSON    `json:"xLabels"`
	YLabels    datatypes.JSON    `json:"yLabels"`
	Visibility ContestVisibility `json:"visibility"`
	Status     ContestStatus     `json:"status"`
	GameID     *uuid.UUID        `json:"gameId,omitempty"`
	Version    int64             `json:"version"`
	UpdatedAt  time.Time         `json:"updatedAt"`
}

func NewContestUpdate(contest *Contest) ContestUpdate {
	return ContestUpdate{
		Name:       contest.Name,
		HomeTeam:   contest.HomeTeam,
		AwayTeam:   contest.AwayTeam,
		XLabels:    contest.XLabels,
		YLabels:    contest.YLabels,
		Visibility: contest.Visibility,
		Status:     contest.Status,
		GameID:     contest.GameID,
		Version:    contest.Version,
		UpdatedAt:  contest.UpdatedAt,
	}
}

type ContestSnapshot struct {
	Contest      *Contest             `json:"contest"`
	Participants []ContestParticipant `json:"participants"`
}
