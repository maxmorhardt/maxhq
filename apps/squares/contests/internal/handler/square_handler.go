package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
)

type SquareHandler interface {
	ClaimSquare(c *gin.Context)
	ClaimRandomSquares(c *gin.Context)
	ClearSquare(c *gin.Context)
	ClearMySquares(c *gin.Context)
}

type squareHandler struct {
	squareService service.SquareService
}

func NewSquareHandler(squareService service.SquareService) SquareHandler {
	return &squareHandler{squareService: squareService}
}

// @Summary Claim a single square in a contest
// @Description Claims a square for the authenticated user using their profile default initials
// @Tags squares
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
func (h *squareHandler) ClaimSquare(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	squareID, ok := api.PathUUID(c, "squareId")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)

	claimedSquare, err := h.squareService.Claim(c.Request.Context(), contestID, squareID, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrSquareNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
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
// @Tags squares
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
func (h *squareHandler) ClaimRandomSquares(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	var req model.RandomClaimRequest
	if c.ShouldBindJSON(&req) != nil {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	resp, err := h.squareService.ClaimRandom(c.Request.Context(), contestID, req.Count, c.GetString(api.UserKey))
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
// @Tags squares
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
func (h *squareHandler) ClearSquare(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	squareID, ok := api.PathUUID(c, "squareId")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	clearedSquare, err := h.squareService.Clear(c.Request.Context(), contestID, squareID, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound), errors.Is(err, errs.ErrSquareNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
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
// @Tags squares
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
func (h *squareHandler) ClearMySquares(c *gin.Context) {
	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	user := c.GetString(api.UserKey)
	clearedSquares, err := h.squareService.ClearByOwner(c.Request.Context(), contestID, user)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrContestNotFound):
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
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
