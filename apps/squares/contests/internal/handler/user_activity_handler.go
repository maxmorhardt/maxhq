package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/strutil"
)

type UserActivityHandler interface {
	GetMyStats(c *gin.Context)
	GetMyActiveContests(c *gin.Context)
}

type userActivityHandler struct {
	userActivityService service.UserActivityService
}

func NewUserActivityHandler(userActivityService service.UserActivityService) UserActivityHandler {
	return &userActivityHandler{userActivityService: userActivityService}
}

// GetMyStats godoc
// @Summary Get the current user's stats
// @Description Returns contest and square stats for the authenticated user
// @Tags users
// @Produce json
// @Success 200 {object} model.UserStatsResponse
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /users/me/stats [get]
func (h *userActivityHandler) GetMyStats(c *gin.Context) {
	user := c.GetString(api.UserKey)

	stats, err := h.userActivityService.GetStats(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, strutil.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetMyActiveContests godoc
// @Summary Get the current user's active contests
// @Description Returns the non-terminal contests the user owns or participates in, which block account deletion
// @Tags users
// @Produce json
// @Success 200 {array} internalapi.UserActiveContest
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /users/me/active-contests [get]
func (h *userActivityHandler) GetMyActiveContests(c *gin.Context) {
	user := c.GetString(api.UserKey)

	active, err := h.userActivityService.GetActiveContests(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, strutil.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, active)
}
