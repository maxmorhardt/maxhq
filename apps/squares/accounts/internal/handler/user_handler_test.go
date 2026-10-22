package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newUserRouter(t *testing.T) (*mocks.UserService, *gin.Engine) {
	t.Helper()
	svc := mocks.NewUserService(t)
	h := NewUserHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("a@b.com"))
	r.GET("/users/me", h.GetMe)
	r.PATCH("/users/me", h.UpdateMe)
	r.DELETE("/users/me", h.DeleteMe)
	r.POST("/users/me/sign-out", h.SignOutMe)
	r.POST("/users/me/restore", h.RestoreMe)

	return svc, r
}

func TestGetMe_Success(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().GetProfile(mock.Anything, "a@b.com", "Test").
		Return(&model.User{Email: "a@b.com", DisplayName: "Max"}, nil)

	req, _ := http.NewRequest(http.MethodGet, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.UserProfileResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "a@b.com", resp.Email)
	assert.Equal(t, "Max", resp.DisplayName)
}

func TestGetMe_ServiceError(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().GetProfile(mock.Anything, "a@b.com", "Test").
		Return(nil, errs.ErrDatabaseUnavailable)

	req, _ := http.NewRequest(http.MethodGet, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUpdateMe_Success(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().UpdateProfile(mock.Anything, "a@b.com", "MM").
		Return(&model.User{Email: "a@b.com", DisplayName: "Max", DefaultInitials: "MM"}, nil)

	w := doRequest(r, patchMe(model.UpdateUserProfileRequest{DefaultInitials: "MM"}))

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.UserProfileResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "MM", resp.DefaultInitials)
}

func TestUpdateMe_InvalidBody(t *testing.T) {
	_, r := newUserRouter(t)

	w := doRequest(r, patchMe(model.UpdateUserProfileRequest{DefaultInitials: "mm"}))

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateMe_ServiceError(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().UpdateProfile(mock.Anything, "a@b.com", "MM").
		Return(nil, errs.ErrDatabaseUnavailable)

	w := doRequest(r, patchMe(model.UpdateUserProfileRequest{DefaultInitials: "MM"}))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUpdateMe_UnknownUser(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().UpdateProfile(mock.Anything, "a@b.com", "MM").Return(nil, errs.ErrUserNotFound)

	w := doRequest(r, patchMe(model.UpdateUserProfileRequest{DefaultInitials: "MM"}))

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteMe_Success(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().DeleteAccount(mock.Anything, "a@b.com").Return(nil)

	req, _ := http.NewRequest(http.MethodDelete, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestDeleteMe_BlockedByActiveContests(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().DeleteAccount(mock.Anything, "a@b.com").Return(errs.ErrAccountActiveContests)

	req, _ := http.NewRequest(http.MethodDelete, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestDeleteMe_ServiceError(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().DeleteAccount(mock.Anything, "a@b.com").Return(errs.ErrDatabaseUnavailable)

	req, _ := http.NewRequest(http.MethodDelete, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestDeleteMe_ContestsUnavailable(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().DeleteAccount(mock.Anything, "a@b.com").Return(errs.ErrDependencyFailed)

	req, _ := http.NewRequest(http.MethodDelete, "/users/me", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
}

func authenticatedMiddleware(userID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := &api.Claims{Email: userID, EmailVerified: true, Name: "Test", IssuedAt: 1000, Expire: 9999999999}
		api.SetContextValue(c, api.UserKey, userID)
		api.SetContextValue(c, api.ClaimsKey, claims)
		c.Next()
	}
}

func patchMe(v any) *http.Request {
	body, _ := json.Marshal(v)
	req, _ := http.NewRequest(http.MethodPatch, "/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func post(r *gin.Engine, path string) int {
	req, _ := http.NewRequest(http.MethodPost, path, http.NoBody)
	return doRequest(r, req).Code
}

func TestSignOutMe(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().SignOut(mock.Anything, "a@b.com", int64(1000), int64(9999999999)).Return(nil).Once()
	assert.Equal(t, http.StatusNoContent, post(r, "/users/me/sign-out"))

	svc.EXPECT().SignOut(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrDependencyFailed)
	assert.Equal(t, http.StatusServiceUnavailable, post(r, "/users/me/sign-out"))
}

func TestRestoreMe(t *testing.T) {
	svc, r := newUserRouter(t)
	svc.EXPECT().RestoreAccount(mock.Anything, "a@b.com", int64(1000)).Return(nil).Once()
	assert.Equal(t, http.StatusNoContent, post(r, "/users/me/restore"))

	for err, code := range map[error]int{
		errs.ErrRestoreTooOld:       http.StatusForbidden,
		errs.ErrDependencyFailed:    http.StatusServiceUnavailable,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	} {
		svc.EXPECT().RestoreAccount(mock.Anything, mock.Anything, mock.Anything).Return(err).Once()
		assert.Equal(t, code, post(r, "/users/me/restore"), err.Error())
	}
}
