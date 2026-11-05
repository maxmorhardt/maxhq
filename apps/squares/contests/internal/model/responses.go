package model

import (
	"time"

	"github.com/google/uuid"
)

type StatsResponse struct {
	ContestsCreatedToday int64 `json:"contestsCreatedToday" example:"5"`
	SquaresClaimedToday  int64 `json:"squaresClaimedToday" example:"42"`
	TotalActiveContests  int64 `json:"totalActiveContests" example:"12"`
}

type LeaderboardEntry struct {
	Rank           int    `json:"rank" example:"1"`
	UserID         string `json:"userId" example:"u_3q2mL0x9VfTzQk1rB7cW8a"`
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

// what someone opening an invite link sees before signing in
type InvitePreviewResponse struct {
	ContestID      uuid.UUID     `json:"contestId"`
	ContestName    string        `json:"contestName"`
	OwnerName      string        `json:"ownerName,omitempty"`
	Status         ContestStatus `json:"status"`
	ClaimedSquares int           `json:"claimedSquares"`
	TotalSquares   int           `json:"totalSquares"`
	HomeTeam       string        `json:"homeTeam,omitempty"`
	AwayTeam       string        `json:"awayTeam,omitempty"`
	HomeAbbr       string        `json:"homeAbbr,omitempty"`
	AwayAbbr       string        `json:"awayAbbr,omitempty"`
	GameTime       *time.Time    `json:"gameTime,omitempty"`
}

type InviteLinkResponse struct {
	Token string `json:"token" example:"9f2c4e1a7b3d5f6e8a0c2e4f6a8b0d1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3"`
}

type ParticipantIdentity struct {
	UserID   string `json:"userId" example:"u_3q2mL0x9VfTzQk1rB7cW8a"`
	FullName string `json:"fullName" example:"Max Morhardt"`
}

type RandomClaimResponse struct {
	Squares   []Square `json:"squares"`
	Requested int      `json:"requested" example:"5"`
}
