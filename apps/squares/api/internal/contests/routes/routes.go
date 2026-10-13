package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/handler"
)

type Handlers struct {
	Contest      handler.ContestHandler
	Participant  handler.ParticipantHandler
	Invite       handler.InviteHandler
	Leaderboard  handler.LeaderboardHandler
	Stats        handler.StatsHandler
	UserActivity handler.UserActivityHandler
	Internal     handler.InternalHandler
}

// Auth trusts the gateway's identity headers, Idempotent replays retried writes, Internal checks the service token
type Guards struct {
	Auth       gin.HandlerFunc
	Idempotent gin.HandlerFunc
	Internal   gin.HandlerFunc
}

func Register(r *gin.Engine, h *Handlers, g Guards) {
	// every write is authenticated first so idempotency keys are scoped to the caller
	write := func(final gin.HandlerFunc) []gin.HandlerFunc {
		return []gin.HandlerFunc{g.Auth, g.Idempotent, final}
	}

	contests := r.Group("/contests")
	contests.GET("/owner/:owner", g.Auth, h.Contest.GetContestsByOwner)
	contests.GET("/me", g.Auth, h.Participant.GetMyContests)
	contests.PUT("", write(h.Contest.CreateContest)...)
	contests.PATCH("/:id", write(h.Contest.UpdateContest)...)
	contests.POST("/:id/start", write(h.Contest.StartContest)...)
	contests.POST("/:id/quarter-result", write(h.Contest.RecordQuarterResult)...)
	contests.POST("/:id/quarter-result/rollback", write(h.Contest.RollbackLastQuarterResult)...)
	contests.DELETE("/:id", write(h.Contest.DeleteContest)...)
	contests.POST("/:id/squares/:squareId/claim", write(h.Contest.ClaimSquare)...)
	contests.POST("/:id/squares/clear-mine", write(h.Contest.ClearMySquares)...)
	contests.POST("/:id/squares/:squareId/clear", write(h.Contest.ClearSquare)...)

	contests.GET("/:id/participants", g.Auth, h.Participant.GetParticipants)
	contests.PATCH("/:id/participants/:userId", write(h.Participant.UpdateParticipant)...)
	contests.DELETE("/:id/participants/:userId", write(h.Participant.RemoveParticipant)...)

	contests.POST("/:id/invites", write(h.Invite.CreateInvite)...)
	contests.GET("/:id/invites", g.Auth, h.Invite.GetInvites)
	contests.DELETE("/:id/invites/:inviteId", write(h.Invite.DeleteInvite)...)

	invites := r.Group("/invites")
	invites.GET("/:token", h.Invite.GetInvitePreview)
	invites.POST("/:token/redeem", write(h.Invite.RedeemInvite)...)

	r.GET("/leaderboard", h.Leaderboard.GetLeaderboard)
	r.GET("/leaderboard/me", g.Auth, h.Leaderboard.GetMyRank)
	r.GET("/stats", h.Stats.GetStats)

	r.GET("/users/me/stats", g.Auth, h.UserActivity.GetMyStats)
	r.GET("/users/me/active-contests", g.Auth, h.UserActivity.GetMyActiveContests)

	internal := r.Group("/internal", g.Internal)
	internal.GET("/contests/:id/snapshot", h.Internal.GetContestSnapshot)
	internal.GET("/users/:email/activity", h.Internal.GetUserActivity)
}
