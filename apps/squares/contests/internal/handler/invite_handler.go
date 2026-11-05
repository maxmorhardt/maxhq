package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

type InviteHandler interface {
	GetInviteLink(c *gin.Context)
	ResetInviteLink(c *gin.Context)
	GetInvitePreview(c *gin.Context)
	JoinContest(c *gin.Context)
}

type inviteHandler struct {
	inviteService service.InviteService
}

func NewInviteHandler(inviteService service.InviteService) InviteHandler {
	return &inviteHandler{
		inviteService: inviteService,
	}
}

// @Summary Get a contest's invite link
// @Description The owner reads the token of the contest's one invite link
// @Tags invites
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {object} model.InviteLinkResponse
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/invite [get]
func (h *inviteHandler) GetInviteLink(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	link, err := h.inviteService.GetInviteLink(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to get invite link", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get invite link", c))
		}
		return
	}

	c.JSON(http.StatusOK, link)
}

// @Summary Reset a contest's invite link
// @Description The owner replaces the invite link, so the old one stops working
// @Tags invites
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {object} model.InviteLinkResponse
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/invite/reset [post]
func (h *inviteHandler) ResetInviteLink(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	link, err := h.inviteService.ResetInviteLink(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrNotParticipant), errors.Is(err, errs.ErrInsufficientRole), errors.Is(err, errs.ErrContestFinalized):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to reset invite link", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to reset invite link", c))
		}
		return
	}

	c.JSON(http.StatusOK, link)
}

// @Summary Preview an invite link
// @Description Returns the contest an invite link joins, without authentication
// @Tags invites
// @Produce json
// @Param token path string true "Invite token"
// @Success 200 {object} model.InvitePreviewResponse
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /invites/{token} [get]
func (h *inviteHandler) GetInvitePreview(c *gin.Context) {
	log := logging.FromGin(c)

	preview, err := h.inviteService.GetInvitePreview(c.Request.Context(), c.Param("token"))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrInviteNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		default:
			log.Error("failed to get invite preview", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get invite", c))
		}
		return
	}

	c.JSON(http.StatusOK, preview)
}

// @Summary Join a contest with its invite link
// @Description The signed-in user joins as a participant with no squares; the owner gives them squares afterwards
// @Tags invites
// @Produce json
// @Param token path string true "Invite token"
// @Success 201 {object} model.ContestParticipant
// @Failure 403 {object} api.APIError "The contest is finished, or the owner removed this user"
// @Failure 404 {object} api.APIError
// @Failure 409 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /invites/{token}/join [post]
func (h *inviteHandler) JoinContest(c *gin.Context) {
	log := logging.FromGin(c)

	name := ""
	if claims := api.ClaimsFromContext(c.Request.Context()); claims != nil {
		name = claims.Name
	}

	participant, err := h.inviteService.Join(c.Request.Context(), c.Param("token"), c.GetString(api.UserKey), name)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrInviteNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrContestFinalized), errors.Is(err, errs.ErrBannedFromContest):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrAlreadyParticipant):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		default:
			log.Error("failed to join contest", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to join contest", c))
		}
		return
	}

	c.JSON(http.StatusCreated, participant)
}
