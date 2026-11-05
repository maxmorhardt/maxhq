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

type ParticipantHandler interface {
	GetRoster(c *gin.Context)
	UpdateParticipant(c *gin.Context)
	AllotSquares(c *gin.Context)
	RemoveParticipant(c *gin.Context)
	GetBans(c *gin.Context)
	Unban(c *gin.Context)
}

type participantHandler struct {
	participantService service.ParticipantService
}

func NewParticipantHandler(participantService service.ParticipantService) ParticipantHandler {
	return &participantHandler{
		participantService: participantService,
	}
}

// @Summary Who each participant is
// @Description Full names for the contest's owner, so they know who joined. Other participants only ever see short names.
// @Tags participants
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.ParticipantIdentity
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/roster [get]
func (h *participantHandler) GetRoster(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	roster, err := h.participantService.GetRoster(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to get roster", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get roster", c))
		}
		return
	}

	c.JSON(http.StatusOK, roster)
}

// @Summary Set a participant's square limit
// @Description The owner sets how many squares a participant can claim. Lowering it below what they hold frees that many of their squares at random. The board never gives out more than 100 squares in total.
// @Tags participants
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param userId path string true "Target user ID"
// @Param participant body model.UpdateParticipantRequest true "The new square limit"
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

	var req model.UpdateParticipantRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		log.Warn("failed to bind update participant json", "error", bindErr)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	participant, err := h.participantService.UpdateParticipant(c.Request.Context(), contestID, c.Param("userId"), *req.MaxSquares, c.GetString(api.UserKey))
	if err != nil {
		h.allotmentError(c, err, "Failed to update participant")
		return
	}

	c.JSON(http.StatusOK, participant)
}

// @Summary Give squares to everyone without any
// @Description The owner gives every participant who has no squares the same number. Nothing changes if that would give out more than 100 squares in total.
// @Tags participants
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param allotment body model.AllotSquaresRequest true "Squares for each participant without any"
// @Success 200 {array} model.ContestParticipant
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/participants/allot [post]
func (h *participantHandler) AllotSquares(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	var req model.AllotSquaresRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		log.Warn("failed to bind allot squares json", "error", bindErr)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	allotted, err := h.participantService.AllotSquares(c.Request.Context(), contestID, req.MaxSquares, c.GetString(api.UserKey))
	if err != nil {
		h.allotmentError(c, err, "Failed to give out squares")
		return
	}

	c.JSON(http.StatusOK, allotted)
}

func (h *participantHandler) allotmentError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrNotParticipant):
		c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
	case errors.Is(err, errs.ErrContestFinalized), errors.Is(err, errs.ErrParticipantsLocked), errors.Is(err, errs.ErrInsufficientRole):
		c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
	case errors.Is(err, errs.ErrNotEnoughSquares):
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
	default:
		logging.FromGin(c).Error("failed to change square limits", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, fallback, c))
	}
}

// @Summary Remove a participant from a contest
// @Description The owner removes a participant, who is banned from rejoining until the owner unbans them, or a participant leaves on their own and can rejoin. Their squares are freed before kickoff and ghosted after. The owner cannot be removed.
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

	if err := h.participantService.RemoveParticipant(c.Request.Context(), contestID, c.Param("userId"), c.GetString(api.UserKey)); err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrNotParticipant):
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

// @Summary Who is banned from a contest
// @Description The owner lists the people they removed, with full names, newest first
// @Tags participants
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.ContestBan
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/bans [get]
func (h *participantHandler) GetBans(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	bans, err := h.participantService.GetBans(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to get bans", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get bans", c))
		}
		return
	}

	c.JSON(http.StatusOK, bans)
}

// @Summary Unban someone from a contest
// @Description The owner lets a removed person rejoin with the invite link
// @Tags participants
// @Param id path string true "Contest ID"
// @Param userId path string true "Banned user ID"
// @Success 204
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/bans/{userId} [delete]
func (h *participantHandler) Unban(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	if err := h.participantService.Unban(c.Request.Context(), contestID, c.Param("userId"), c.GetString(api.UserKey)); err != nil {
		switch {
		case errors.Is(err, errs.ErrNotBanned):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to unban", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to unban", c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
