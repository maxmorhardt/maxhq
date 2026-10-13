package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxstash/libs/go/platform/api"
	"github.com/maxmorhardt/maxstash/libs/go/platform/strutil"
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
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /internal/contests/{id}/snapshot [get]
func (h *internalHandler) GetContestSnapshot(c *gin.Context) {
	contestID, err := uuid.Parse(c.Param("id"))
	user := c.Query("user")
	if err != nil || user == "" {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Contest ID and user are required", c))
		return
	}

	snapshot, err := h.snapshotService.GetSnapshot(c.Request.Context(), contestID, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, strutil.CapitalizeFirstLetter(err), c))
		case errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, strutil.CapitalizeFirstLetter(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, strutil.CapitalizeFirstLetter(errs.ErrDatabaseUnavailable), c))
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
// @Success 200 {object} internalapi.UserActivitySummary
// @Failure 500 {object} api.APIError
// @Router /internal/users/{email}/activity [get]
func (h *internalHandler) GetUserActivity(c *gin.Context) {
	summary, err := h.userActivityService.GetActivitySummary(c.Request.Context(), c.Param("email"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, strutil.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, summary)
}
