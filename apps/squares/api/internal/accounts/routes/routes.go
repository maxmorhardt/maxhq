package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/handler"
)

type Handlers struct {
	User    handler.UserHandler
	Contact handler.ContactHandler
}

// ContactLimit throttles the public form per client ip; Idempotent replays retried writes
type Guards struct {
	Auth         gin.HandlerFunc
	Idempotent   gin.HandlerFunc
	ContactLimit gin.HandlerFunc
}

func Register(r *gin.Engine, h Handlers, g Guards) {
	me := r.Group("/users/me", g.Auth)
	me.GET("", h.User.GetMe)
	me.PATCH("", g.Idempotent, h.User.UpdateMe)
	me.DELETE("", g.Idempotent, h.User.DeleteMe)

	r.POST("/contact", g.ContactLimit, g.Idempotent, h.Contact.SubmitContact)
}
