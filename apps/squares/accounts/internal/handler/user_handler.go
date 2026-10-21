package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
)

type UserHandler interface {
	GetMe(c *gin.Context)
	UpdateMe(c *gin.Context)
	DeleteMe(c *gin.Context)
	SignOutMe(c *gin.Context)
	RestoreMe(c *gin.Context)
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
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /users/me [get]
func (h *userHandler) GetMe(c *gin.Context) {
	user := c.GetString(api.UserKey)

	defaultDisplayName := user
	if claims := api.ClaimsFromContext(c.Request.Context()); claims != nil && claims.Name != "" {
		defaultDisplayName = claims.Name
	}

	profile, err := h.userService.GetProfile(c.Request.Context(), user, defaultDisplayName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
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
// @Failure 400 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /users/me [patch]
func (h *userHandler) UpdateMe(c *gin.Context) {
	user := c.GetString(api.UserKey)

	var req model.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logging.FromGin(c).Warn("failed to bind json", "error", err)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(errs.ErrInvalidRequestBody), c))
		return
	}

	profile, err := h.userService.UpdateProfile(c.Request.Context(), user, req.DefaultInitials)
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(err), c))
			return
		}
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		return
	}

	c.JSON(http.StatusOK, toProfileResponse(profile))
}

// DeleteMe godoc
// @Summary Delete the current user's account
// @Description Deletes the account and tombstones it so older tokens stop working everywhere; contests anonymizes the history under the ghost identity. Blocked while the user owns or participates in any active contest.
// @Tags users
// @Success 204
// @Failure 409 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Failure 503 {object} api.APIError
// @Security BearerAuth
// @Router /users/me [delete]
func (h *userHandler) DeleteMe(c *gin.Context) {
	user := c.GetString(api.UserKey)

	if err := h.userService.DeleteAccount(c.Request.Context(), user); err != nil {
		switch {
		case errors.Is(err, errs.ErrAccountActiveContests):
			c.JSON(http.StatusConflict, api.NewAPIError(http.StatusConflict, api.Message(err), c))
		case errors.Is(err, errs.ErrDependencyFailed):
			c.JSON(http.StatusServiceUnavailable, api.NewAPIError(http.StatusServiceUnavailable, api.Message(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// SignOutMe godoc
// @Summary Sign out the current token
// @Description Revokes the token this request was made with until it expires, so a copy of it stops working. The account's other devices keep their own tokens.
// @Tags users
// @Success 204
// @Failure 503 {object} api.APIError
// @Security BearerAuth
// @Router /users/me/sign-out [post]
func (h *userHandler) SignOutMe(c *gin.Context) {
	claims := api.ClaimsFromContext(c.Request.Context())

	if err := h.userService.SignOut(c.Request.Context(), claims.Email, claims.IssuedAt, claims.Expire); err != nil {
		c.JSON(http.StatusServiceUnavailable, api.NewAPIError(http.StatusServiceUnavailable, api.Message(err), c))
		return
	}

	c.Status(http.StatusNoContent)
}

// RestoreMe godoc
// @Summary Restore an account after a new sign-in
// @Description Deleting an account blocks every token for it, refreshed ones included, until the user signs in again. The web calls this right after an interactive sign-in to lift that block; a token issued before the deletion is refused.
// @Tags users
// @Success 204
// @Failure 403 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Failure 503 {object} api.APIError
// @Security BearerAuth
// @Router /users/me/restore [post]
func (h *userHandler) RestoreMe(c *gin.Context) {
	claims := api.ClaimsFromContext(c.Request.Context())

	if err := h.userService.RestoreAccount(c.Request.Context(), claims.Email, claims.IssuedAt); err != nil {
		switch {
		case errors.Is(err, errs.ErrRestoreTooOld):
			c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, api.Message(err), c))
		case errors.Is(err, errs.ErrDependencyFailed):
			c.JSON(http.StatusServiceUnavailable, api.NewAPIError(http.StatusServiceUnavailable, api.Message(err), c))
		default:
			c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, api.Message(err), c))
		}
		return
	}

	c.Status(http.StatusNoContent)
}
