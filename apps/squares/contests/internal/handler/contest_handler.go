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

type ContestHandler interface {
	CreateContest(c *gin.Context)
	DeleteContest(c *gin.Context)

	ClaimSquare(c *gin.Context)
	ClaimRandomSquares(c *gin.Context)
	ClearSquare(c *gin.Context)
	ClearMySquares(c *gin.Context)
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
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
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
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrContestNotFound), c))
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

// @Summary Claim a single square in a contest
// @Description Claims a square for the authenticated user using their profile default initials
// @Tags contests
// @Produce json
// @Param id path string true "Contest ID"
// @Param squareId path string true "Square ID"
// @Success 200 {object} model.Square
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 409 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/squares/{squareId}/claim [put]
func (h *contestHandler) ClaimSquare(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	squareID, ok := api.PathUUID(c, "squareId")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)

	claimedSquare, err := h.contestService.ClaimSquare(c.Request.Context(), contestID, squareID, user)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrSquareNotFound), c))
		case errors.Is(err, errs.ErrSquareNotEditable):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrUnauthorizedSquareEdit):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrMissingInitials), errors.Is(err, errs.ErrSquareTaken):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrClaimsNotFound):
			c.JSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, api.Message(err), c))
		case errors.Is(err, errs.ErrDatabaseUnavailable):
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		default:
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
		}
		return
	}

	c.JSON(http.StatusOK, claimedSquare)
}

// @Summary Claim random empty squares
// @Description Claims up to count random empty squares for the caller in one step, capped by their square limit and what is left
// @Tags contests
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param request body model.RandomClaimRequest true "How many squares"
// @Success 200 {object} model.RandomClaimResponse
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 409 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests/{id}/squares/random [post]
func (h *contestHandler) ClaimRandomSquares(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	var req model.RandomClaimRequest
	if c.ShouldBindJSON(&req) != nil {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	resp, err := h.contestService.ClaimRandomSquares(c.Request.Context(), contestID, req.Count, c.GetString(api.UserKey))
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrSquareNotEditable), errors.Is(err, errs.ErrUnauthorizedSquareEdit), errors.Is(err, errs.ErrNotParticipant):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrMissingInitials), errors.Is(err, errs.ErrNoEmptySquares), errors.Is(err, errs.ErrSquareLimitReached):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrClaimsNotFound):
			c.JSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, api.Message(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to claim squares", c))
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}

// @Summary Clear square value and owner
// @Description Clears a square's value and owner, making it available for anyone to claim
// @Tags contests
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Param squareId path string true "Square ID"
// @Success 200 {object} model.Square
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Failure 409 {object} api.APIError "The board is full and locked"
// @Router /contests/{id}/squares/{squareId}/claim [delete]
func (h *contestHandler) ClearSquare(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	squareID, ok := api.PathUUID(c, "squareId")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	clearedSquare, err := h.contestService.ClearSquare(c.Request.Context(), contestID, squareID, user)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrSquareNotFound), c))
		case errors.Is(err, errs.ErrBoardLocked):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrSquareNotEditable):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrUnauthorizedSquareEdit):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrDatabaseUnavailable):
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		default:
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
		}
		return
	}

	c.JSON(http.StatusOK, clearedSquare)
}

// @Summary Clear all of the caller's squares in a contest
// @Description Clears the value and owner of every square owned by the authenticated user. Only the caller's own squares are affected.
// @Tags contests
// @Accept json
// @Produce json
// @Param id path string true "Contest ID"
// @Success 200 {array} model.Square
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Failure 409 {object} api.APIError "The board is full and locked"
// @Router /contests/{id}/squares/claims [delete]
func (h *contestHandler) ClearMySquares(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	clearedSquares, err := h.contestService.ClearUserSquares(c.Request.Context(), contestID, user)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrContestNotFound), c))
		case errors.Is(err, errs.ErrBoardLocked):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrSquareNotEditable):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrDatabaseUnavailable):
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		default:
			c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
		}
		return
	}

	c.JSON(http.StatusOK, clearedSquares)
}
