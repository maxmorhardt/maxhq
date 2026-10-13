package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
)

type LeaderboardHandler interface {
	GetLeaderboard(c *gin.Context)
	GetMyRank(c *gin.Context)
}

type leaderboardHandler struct {
	leaderboardService service.LeaderboardService
}

func NewLeaderboardHandler(leaderboardService service.LeaderboardService) LeaderboardHandler {
	return &leaderboardHandler{
		leaderboardService: leaderboardService,
	}
}

// GetLeaderboard godoc
// @Summary Get the all-time leaderboard
// @Description Returns players ranked by quarter wins. Display names only, no emails
// @Tags leaderboard
// @Produce json
// @Param limit query int false "Number of players to return (1-100, default 10)"
// @Success 200 {object} model.LeaderboardResponse
// @Failure 400 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /leaderboard [get]
func (h *leaderboardHandler) GetLeaderboard(c *gin.Context) {
	log := logging.FromGin(c)

	limit := service.DefaultLeaderboardLimit
	if raw := c.Query("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 || parsed > service.MaxLeaderboardLimit {
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Limit must be between 1 and 100", c))
			return
		}

		limit = parsed
	}

	leaderboard, err := h.leaderboardService.GetLeaderboard(c.Request.Context(), limit)
	if err != nil {
		log.Error("failed to get leaderboard", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get leaderboard", c))
		return
	}

	c.JSON(http.StatusOK, leaderboard)
}

// GetMyRank godoc
// @Summary Get the current user's leaderboard rank
// @Description Returns the authenticated user's rank, total ranked players, and quarter wins
// @Tags leaderboard
// @Produce json
// @Security BearerAuth
// @Success 200 {object} model.LeaderboardRankResponse
// @Failure 401 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /leaderboard/me [get]
func (h *leaderboardHandler) GetMyRank(c *gin.Context) {
	log := logging.FromGin(c)

	rank, err := h.leaderboardService.GetUserRank(c.Request.Context(), c.GetString(api.UserKey))
	if err != nil {
		log.Error("failed to get user rank", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get your rank", c))
		return
	}

	c.JSON(http.StatusOK, rank)
}
