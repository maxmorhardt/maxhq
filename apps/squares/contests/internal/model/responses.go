package model

import (
	"github.com/google/uuid"
)

type StatsResponse struct {
	ContestsCreatedToday int64 `json:"contestsCreatedToday" example:"5"`
	SquaresClaimedToday  int64 `json:"squaresClaimedToday" example:"42"`
	TotalActiveContests  int64 `json:"totalActiveContests" example:"12"`
}

type LeaderboardEntry struct {
	Rank           int    `json:"rank" example:"1"`
	DisplayName    string `json:"displayName" example:"Max"`
	QuarterWins    int64  `json:"quarterWins" example:"12"`
	SquaresClaimed int64  `json:"squaresClaimed" example:"48"`
	QuartersPlayed int64  `json:"quartersPlayed" example:"40"`
}

type LeaderboardResponse struct {
	Entries []LeaderboardEntry `json:"entries"`
}

type LeaderboardRankResponse struct {
	Rank        int   `json:"rank" example:"7"`
	TotalRanked int64 `json:"totalRanked" example:"143"`
	QuarterWins int64 `json:"quarterWins" example:"5"`
	Ranked      bool  `json:"ranked" example:"true"`
}

type UserStatsResponse struct {
	ContestsCreated int64 `json:"contestsCreated" example:"3"`
	ContestsJoined  int64 `json:"contestsJoined" example:"7"`
	SquaresClaimed  int64 `json:"squaresClaimed" example:"42"`
	QuarterWins     int64 `json:"quarterWins" example:"5"`
	QuartersPlayed  int64 `json:"quartersPlayed" example:"20"`
}

type InvitePreviewResponse struct {
	ContestID   uuid.UUID `json:"contestId"`
	ContestName string    `json:"contestName"`
	Owner       string    `json:"owner"`
	Role        string    `json:"role"`
	MaxSquares  int       `json:"maxSquares"`
}

type RandomClaimResponse struct {
	Squares   []Square `json:"squares"`
	Requested int      `json:"requested" example:"5"`
}
