package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/handler"
)

func Register(r *gin.Engine, h handler.EventsHandler, auth gin.HandlerFunc) {
	r.GET("/events/contests/:id", auth, h.StreamContest)
	r.GET("/events/games/:id", h.StreamGame)
}
