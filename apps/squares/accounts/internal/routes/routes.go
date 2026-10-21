package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/handler"
)

type Handlers struct {
	User    handler.UserHandler
	Contact handler.ContactHandler
}

type Guards struct {
	Auth gin.HandlerFunc
	// lets a fresh sign-in through a deleted account's block, for the one request that lifts it
	Restore    gin.HandlerFunc
	Idempotent gin.HandlerFunc
}

func Register(r *gin.Engine, h Handlers, g Guards) {
	me := r.Group("/users/me", g.Auth)
	me.GET("", h.User.GetMe)
	me.PATCH("", g.Idempotent, h.User.UpdateMe)
	me.DELETE("", g.Idempotent, h.User.DeleteMe)
	me.POST("/sign-out", h.User.SignOutMe)

	r.POST("/users/me/restore", g.Restore, h.User.RestoreMe)

	r.POST("/contact", g.Idempotent, h.Contact.SubmitContact)
}
