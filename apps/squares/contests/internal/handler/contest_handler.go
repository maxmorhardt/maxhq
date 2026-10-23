package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

type ContestHandler interface {
	CreateContest(c *gin.Context)
	DeleteContest(c *gin.Context)
}

type contestHandler struct {
	contestService service.ContestService
}

func NewContestHandler(contestService service.ContestService) ContestHandler {
	return &contestHandler{
		contestService: contestService,
	}
}

// @Summary Create a new Contest
// @Description Creates a new 10x10 contest
// @Tags contests
// @Accept json
// @Produce json
// @Param contest body model.CreateContestRequest true "Contest"
// @Param Idempotency-Key header string false "Replays the first response when a create is retried with the same key"
// @Success 201 {object} model.ContestSwagger
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 409 {object} api.APIError "You already have a contest with this name"
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests [post]
func (h *contestHandler) CreateContest(c *gin.Context) {
	log := logging.FromGin(c)

	var req model.CreateContestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn("failed to bind create contest json", "error", err)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	user := c.GetString(api.UserKey)

	if req.Owner != user {
		log.Warn("user not authorized to create contest", "user", user, "owner", req.Owner)
		c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, "User not authorized to create contest for specified owner", c))
		return
	}

	contest, err := h.contestService.CreateContest(c.Request.Context(), &req, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrDatabaseUnavailable):
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		case errors.Is(err, errs.ErrContestAlreadyExists):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrGameNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to create contest", c))
		}
		return
	}

	c.JSON(http.StatusCreated, contest)
}

// @Summary Delete contest
// @Description Deletes a contest by id. Only the contest owner can delete
// @Tags contests
// @Produce json
// @Param id path string true "Contest ID"
// @Success 204 "Contest deleted successfully"
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id} [delete]
func (h *contestHandler) DeleteContest(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	if err := h.contestService.DeleteContest(c.Request.Context(), contestID, user); err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrContestFinalized):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrUnauthorizedContestDelete):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to delete contest", c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
