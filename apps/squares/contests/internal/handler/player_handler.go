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

type PlayerHandler interface {
	GetRoster(c *gin.Context)
	UpdatePlayer(c *gin.Context)
	AllotSquares(c *gin.Context)
	RemovePlayer(c *gin.Context)
	GetBans(c *gin.Context)
	Unban(c *gin.Context)
}

type playerHandler struct {
	playerService service.PlayerService
}

func NewPlayerHandler(playerService service.PlayerService) PlayerHandler {
	return &playerHandler{
		playerService: playerService,
	}
}

// @Summary Who each player is
// @Description Full names for the contest's owner, so they know who joined. Other players only ever see short names.
// @Tags players
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.PlayerIdentity
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/roster [get]
func (h *playerHandler) GetRoster(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	roster, err := h.playerService.GetRoster(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotPlayer), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to get roster", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get roster", c))
		}
		return
	}

	c.JSON(http.StatusOK, roster)
}

// @Summary Set a player's square limit
// @Description The owner sets how many squares a player can claim. Lowering it below what they hold frees that many of their squares at random. The board never gives out more than 100 squares in total.
// @Tags players
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param userId path string true "Target user ID"
// @Param player body model.UpdatePlayerRequest true "The new square limit"
// @Success 200 {object} model.ContestPlayer
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/players/{userId} [patch]
func (h *playerHandler) UpdatePlayer(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	var req model.UpdatePlayerRequest
	if bindErr := c.ShouldBindJSON(&req); bindErr != nil {
		log.Warn("failed to bind update player json", "error", bindErr)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	player, err := h.playerService.UpdatePlayer(c.Request.Context(), contestID, c.Param("userId"), *req.MaxSquares, c.GetString(api.UserKey))
	if err != nil {
		h.allotmentError(c, err, "Failed to update player")
		return
	}

	c.JSON(http.StatusOK, player)
}

// @Summary Give squares to everyone without any
// @Description The owner gives every player who has no squares the same number. Nothing changes if that would give out more than 100 squares in total.
// @Tags players
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param allotment body model.AllotSquaresRequest true "Squares for each player without any"
// @Success 200 {array} model.ContestPlayer
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/players/allot [post]
func (h *playerHandler) AllotSquares(c *gin.Context) {
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

	allotted, err := h.playerService.AllotSquares(c.Request.Context(), contestID, req.MaxSquares, c.GetString(api.UserKey))
	if err != nil {
		h.allotmentError(c, err, "Failed to give out squares")
		return
	}

	c.JSON(http.StatusOK, allotted)
}

func (h *playerHandler) allotmentError(c *gin.Context, err error, fallback string) {
	switch {
	case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrPlayerNotFound):
		c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
	case errors.Is(err, errs.ErrContestFinalized), errors.Is(err, errs.ErrPlayersLocked),
		errors.Is(err, errs.ErrNotPlayer), errors.Is(err, errs.ErrInsufficientRole):
		c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
	case errors.Is(err, errs.ErrNotEnoughSquares):
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
	default:
		logging.FromGin(c).Error("failed to change square limits", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, fallback, c))
	}
}

// @Summary Remove a player from a contest
// @Description The owner removes a player, who is banned from rejoining until the owner unbans them, or a player leaves on their own and can rejoin. Their squares are freed before kickoff and ghosted after. The owner cannot be removed.
// @Tags players
// @Param id path string true "Contest ID"
// @Param userId path string true "Target user ID"
// @Success 204
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/players/{userId} [delete]
func (h *playerHandler) RemovePlayer(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	if err := h.playerService.RemovePlayer(c.Request.Context(), contestID, c.Param("userId"), c.GetString(api.UserKey)); err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrPlayerNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrContestFinalized), errors.Is(err, errs.ErrNotPlayer),
			errors.Is(err, errs.ErrInsufficientRole), errors.Is(err, errs.ErrCannotRemoveOwner):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to remove player", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to remove player", c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// @Summary Who is banned from a contest
// @Description The owner lists the people they removed, with full names, newest first
// @Tags players
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.ContestBan
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/bans [get]
func (h *playerHandler) GetBans(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	bans, err := h.playerService.GetBans(c.Request.Context(), contestID, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotPlayer), errors.Is(err, errs.ErrInsufficientRole):
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
// @Tags players
// @Param id path string true "Contest ID"
// @Param userId path string true "Banned user ID"
// @Success 204
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/bans/{userId} [delete]
func (h *playerHandler) Unban(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	if err := h.playerService.Unban(c.Request.Context(), contestID, c.Param("userId"), c.GetString(api.UserKey)); err != nil {
		switch {
		case errors.Is(err, errs.ErrNotBanned):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
		case errors.Is(err, errs.ErrNotPlayer), errors.Is(err, errs.ErrInsufficientRole):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		default:
			log.Error("failed to unban", "error", err)
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to unban", c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
