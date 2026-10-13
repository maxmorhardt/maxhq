package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

// service-to-service reads for realtime and accounts; never routed by the gateway
type InternalHandler interface {
	GetContestSnapshot(c *gin.Context)
	GetUserActivity(c *gin.Context)
}

type internalHandler struct {
	snapshotService     service.SnapshotService
	userActivityService service.UserActivityService
}

func NewInternalHandler(snapshotService service.SnapshotService, userActivityService service.UserActivityService) InternalHandler {
	return &internalHandler{snapshotService: snapshotService, userActivityService: userActivityService}
}

// GetContestSnapshot godoc
// @Summary Contest snapshot for a viewer (internal)
// @Description Returns the contest and its participants if the given user may view it. Called by the realtime service.
// @Tags internal
// @Produce json
// @Param id path string true "Contest ID"
// @Param user query string true "Viewer email"
// @Param X-Internal-Token header string true "Shared service token"
// @Success 200 {object} model.ContestSnapshotSwagger
// @Failure 400 {object} model.APIError
// @Failure 403 {object} model.APIError
// @Failure 404 {object} model.APIError
// @Failure 500 {object} model.APIError
// @Router /internal/contests/{id}/snapshot [get]
func (h *internalHandler) GetContestSnapshot(c *gin.Context) {
	contestID, err := uuid.Parse(c.Param("id"))
	user := c.Query("user")
	if err != nil || user == "" {
		c.JSON(http.StatusBadRequest, model.NewAPIError(http.StatusBadRequest, "Contest ID and user are required", c))
		return
	}

	snapshot, err := h.snapshotService.GetSnapshot(c.Request.Context(), contestID, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, model.NewAPIError(http.StatusNotFound, util.CapitalizeFirstLetter(err), c))
		case errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, model.NewAPIError(http.StatusForbidden, util.CapitalizeFirstLetter(err), c))
		default:
			c.JSON(http.StatusInternalServerError, model.NewAPIError(http.StatusInternalServerError, util.CapitalizeFirstLetter(errs.ErrDatabaseUnavailable), c))
		}
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

// GetUserActivity godoc
// @Summary A user's contest activity (internal)
// @Description Returns the user's live contests and first activity. Called by the accounts service before it creates a profile or deletes an account.
// @Tags internal
// @Produce json
// @Param email path string true "User email"
// @Param X-Internal-Token header string true "Shared service token"
// @Success 200 {object} model.UserActivitySummary
// @Failure 500 {object} model.APIError
// @Router /internal/users/{email}/activity [get]
func (h *internalHandler) GetUserActivity(c *gin.Context) {
	summary, err := h.userActivityService.GetActivitySummary(c.Request.Context(), c.Param("email"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.NewAPIError(http.StatusInternalServerError, util.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, summary)
}
