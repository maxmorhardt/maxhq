package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/accounts/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

type UserHandler interface {
	GetMe(c *gin.Context)
	UpdateMe(c *gin.Context)
	DeleteMe(c *gin.Context)
}

type userHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) UserHandler {
	return &userHandler{
		userService: userService,
	}
}

// GetMe godoc
// @Summary Get the current user's profile
// @Description Returns the profile of the authenticated user, creating it on first access
// @Tags users
// @Produce json
// @Success 200 {object} model.UserProfileResponse
// @Failure 500 {object} model.APIError
// @Security BearerAuth
// @Router /users/me [get]
func (h *userHandler) GetMe(c *gin.Context) {
	user := c.GetString(model.UserKey)

	// provider full name seeds the display name on first visit
	defaultDisplayName := user
	if claims := util.ClaimsFromContext(c.Request.Context()); claims != nil && claims.Name != "" {
		defaultDisplayName = claims.Name
	}

	profile, err := h.userService.GetProfile(c.Request.Context(), user, defaultDisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.NewAPIError(http.StatusInternalServerError, util.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, toProfileResponse(profile))
}

func toProfileResponse(user *model.User) model.UserProfileResponse {
	return model.UserProfileResponse{
		Email:           user.Email,
		DisplayName:     user.DisplayName,
		DefaultInitials: user.DefaultInitials,
		CreatedAt:       user.CreatedAt.Format(time.RFC3339),
	}
}

// UpdateMe godoc
// @Summary Update the current user's profile
// @Description Updates the authenticated user's default initials; contests applies them to the user's squares in live contests
// @Tags users
// @Accept json
// @Produce json
// @Param profile body model.UpdateUserProfileRequest true "Profile"
// @Param Idempotency-Key header string false "Replays the first response when an update is retried with the same key"
// @Success 200 {object} model.UserProfileResponse
// @Failure 400 {object} model.APIError
// @Failure 404 {object} model.APIError
// @Failure 500 {object} model.APIError
// @Security BearerAuth
// @Router /users/me [patch]
func (h *userHandler) UpdateMe(c *gin.Context) {
	user := c.GetString(model.UserKey)

	var req model.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		util.LoggerFromGinContext(c).Warn("failed to bind json", "error", err)
		c.JSON(http.StatusBadRequest, model.NewAPIError(http.StatusBadRequest, util.CapitalizeFirstLetter(errs.ErrInvalidRequestBody), c))
		return
	}

	profile, err := h.userService.UpdateProfile(c.Request.Context(), user, req.DefaultInitials)
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, model.NewAPIError(http.StatusNotFound, util.CapitalizeFirstLetter(err), c))
			return
		}
		c.JSON(http.StatusInternalServerError, model.NewAPIError(http.StatusInternalServerError, util.CapitalizeFirstLetter(err), c))
		return
	}

	c.JSON(http.StatusOK, toProfileResponse(profile))
}

// DeleteMe godoc
// @Summary Delete the current user's account
// @Description Deletes the account and tombstones it so older tokens stop working everywhere; contests anonymizes the history under the ghost identity. Blocked while the user owns or participates in any active contest.
// @Tags users
// @Success 204
// @Failure 409 {object} model.APIError
// @Failure 500 {object} model.APIError
// @Failure 503 {object} model.APIError
// @Security BearerAuth
// @Router /users/me [delete]
func (h *userHandler) DeleteMe(c *gin.Context) {
	user := c.GetString(model.UserKey)

	if err := h.userService.DeleteAccount(c.Request.Context(), user); err != nil {
		switch {
		case errors.Is(err, errs.ErrAccountActiveContests):
			c.JSON(http.StatusConflict, model.NewAPIError(http.StatusConflict, util.CapitalizeFirstLetter(err), c))
		case errors.Is(err, errs.ErrDependencyFailed):
			c.JSON(http.StatusServiceUnavailable, model.NewAPIError(http.StatusServiceUnavailable, util.CapitalizeFirstLetter(err), c))
		default:
			c.JSON(http.StatusInternalServerError, model.NewAPIError(http.StatusInternalServerError, util.CapitalizeFirstLetter(err), c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
