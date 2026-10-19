package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/handler"
)

func Register(r *gin.Engine, h handler.GameHandler, auth gin.HandlerFunc) {
	r.GET("/games/upcoming", auth, h.GetUpcoming)
}
