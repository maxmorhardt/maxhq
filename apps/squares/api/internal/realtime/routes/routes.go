package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/handler"
)

func Register(r *gin.Engine, h handler.EventsHandler, auth gin.HandlerFunc) {
	r.GET("/events/contests/:id", auth, h.StreamContest)
}
