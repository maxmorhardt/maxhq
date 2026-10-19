package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"gorm.io/gorm"
)

type ParticipantHandler interface {
	GetParticipants(c *gin.Context)
	UpdateParticipant(c *gin.Context)
	RemoveParticipant(c *gin.Context)
}

type participantHandler struct {
	participantService service.ParticipantService
}

func NewParticipantHandler(participantService service.ParticipantService) ParticipantHandler {
	return &participantHandler{
		participantService: participantService,
	}
}

// @Summary Get all participants for a contest
// @Description Returns all participants and their roles. Any participant can view. Public contests allow any authenticated user
// @Tags participants
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.ContestParticipant
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/participants [get]
func (h *participantHandler) GetParticipants(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	participants, err := h.participantService.GetParticipants(c.Request.Context(), contestID, user)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrContestNotFound), c))
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(errs.ErrInsufficientRole), c))
		default:
			log.Error("failed to get participants", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get participants", c))
		}
		return
	}

	c.JSON(http.StatusOK, participants)
}

// @Summary Update a participant's role or square limit
// @Description Owner updates a participant's role or max squares
// @Tags participants
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param userId path string true "Target user ID"
// @Param participant body model.UpdateParticipantRequest true "Update details"
// @Success 200 {object} model.ContestParticipant
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/participants/{userId} [patch]
func (h *participantHandler) UpdateParticipant(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	targetUserID := c.Param("userId")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "User ID is required", c))
		return
	}

	var req model.UpdateParticipantRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		log.Warn("failed to bind update participant json", "error", bindErr)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	user := c.GetString(api.UserKey)
	participant, err := h.participantService.UpdateParticipant(c.Request.Context(), contestID, targetUserID, &req, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotParticipant):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrContestFinalized):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrInsufficientRole), errors.Is(err, errs.ErrCannotChangeOwner):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrSquareLimitTooLow), errors.Is(err, errs.ErrNotEnoughSquares),
			errors.Is(err, errs.ErrInvalidSquareCount), errors.Is(err, errs.ErrViewerCannotHaveSquares):
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
		default:
			log.Error("failed to update participant", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to update participant", c))
		}
		return
	}

	c.JSON(http.StatusOK, participant)
}

// @Summary Remove a participant from a contest
// @Description Owner removes a participant, or a participant removes themselves; the removed participant's squares are cleared. The owner cannot be removed.
// @Tags participants
// @Param id path string true "Contest ID"
// @Param userId path string true "Target user ID"
// @Success 204
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/participants/{userId} [delete]
func (h *participantHandler) RemoveParticipant(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	targetUserID := c.Param("userId")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "User ID is required", c))
		return
	}

	user := c.GetString(api.UserKey)
	if err := h.participantService.RemoveParticipant(c.Request.Context(), contestID, targetUserID, user); err != nil {
		switch {
		case errors.Is(err, errs.ErrNotParticipant):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrContestFinalized):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrInsufficientRole), errors.Is(err, errs.ErrCannotRemoveOwner):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to remove participant", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to remove participant", c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
