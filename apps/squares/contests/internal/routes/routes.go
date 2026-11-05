package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/handler"
)

type Handlers struct {
	Contest     handler.ContestHandler
	Square      handler.SquareHandler
	Feed        handler.FeedHandler
	Participant handler.ParticipantHandler
	Invite      handler.InviteHandler
	Leaderboard handler.LeaderboardHandler
	Stats       handler.StatsHandler
	Internal    handler.InternalHandler
}

type Guards struct {
	Auth       gin.HandlerFunc
	Idempotent gin.HandlerFunc
	Internal   gin.HandlerFunc
	FeedWrite  gin.HandlerFunc
}

func Register(r *gin.Engine, h *Handlers, g Guards) {
	write := func(final gin.HandlerFunc) []gin.HandlerFunc {
		return []gin.HandlerFunc{g.Auth, g.FeedWrite, g.Idempotent, final}
	}

	contests := r.Group("/contests")
	contests.GET("", g.Auth, h.Feed.GetFeed)
	contests.POST("", write(h.Contest.CreateContest)...)
	contests.GET("/:id", g.Auth, h.Contest.GetContest)
	contests.DELETE("/:id", write(h.Contest.DeleteContest)...)
	contests.PUT("/:id/squares/:squareId/claim", write(h.Square.ClaimSquare)...)
	contests.POST("/:id/squares/random", write(h.Square.ClaimRandomSquares)...)
	contests.DELETE("/:id/squares/claims", write(h.Square.ClearMySquares)...)
	contests.DELETE("/:id/squares/:squareId/claim", write(h.Square.ClearSquare)...)

	contests.GET("/:id/roster", g.Auth, h.Participant.GetRoster)
	contests.POST("/:id/participants/allot", write(h.Participant.AllotSquares)...)
	contests.PATCH("/:id/participants/:userId", write(h.Participant.UpdateParticipant)...)
	contests.DELETE("/:id/participants/:userId", write(h.Participant.RemoveParticipant)...)
	contests.GET("/:id/bans", g.Auth, h.Participant.GetBans)
	contests.DELETE("/:id/bans/:userId", write(h.Participant.Unban)...)

	contests.GET("/:id/invite", g.Auth, h.Invite.GetInviteLink)
	contests.POST("/:id/invite/reset", write(h.Invite.ResetInviteLink)...)

	invites := r.Group("/invites")
	invites.GET("/:token", h.Invite.GetInvitePreview)
	invites.POST("/:token/join", write(h.Invite.JoinContest)...)

	r.GET("/leaderboard", h.Leaderboard.GetLeaderboard)
	r.GET("/leaderboard/me", g.Auth, h.Leaderboard.GetMyRank)
	r.GET("/stats", h.Stats.GetStats)
	r.GET("/stats/me", g.Auth, h.Stats.GetMyStats)

	internal := r.Group("/internal", g.Internal)
	internal.GET("/contests/:id/snapshot", h.Internal.GetContestSnapshot)
	internal.GET("/users/:email/activity", h.Internal.GetUserActivity)
}
