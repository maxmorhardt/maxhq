package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func inviteRouter(svc *mocks.InviteService, user string) *gin.Engine {
	h := NewInviteHandler(svc)
	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.GET("/contests/:id/invite", h.GetInviteLink)
	r.POST("/contests/:id/invite/reset", h.ResetInviteLink)
	r.GET("/invites/:token", h.GetInvitePreview)
	r.POST("/invites/:token/join", h.JoinContest)
	return r
}

func TestGetInviteLink_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewInviteService(t)
	svc.EXPECT().GetInviteLink(mock.Anything, contestID, "owner1").Return(&model.InviteLinkResponse{Token: "abc123"}, nil)

	w := doRequest(inviteRouter(svc, "owner1"), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/invite", contestID), nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"token":"abc123"}`, w.Body.String())
}

func TestGetInviteLink_InvalidContestID(t *testing.T) {
	w := doRequest(inviteRouter(mocks.NewInviteService(t), "owner1"), jsonReq(http.MethodGet, "/contests/bad/invite", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetInviteLink_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrContestNotFound:     http.StatusNotFound,
		errs.ErrNotPlayer:           http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewInviteService(t)
		svc.EXPECT().GetInviteLink(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(inviteRouter(svc, "owner1"), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/invite", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestResetInviteLink_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewInviteService(t)
	svc.EXPECT().ResetInviteLink(mock.Anything, contestID, "owner1").Return(&model.InviteLinkResponse{Token: "fresh"}, nil)

	w := doRequest(inviteRouter(svc, "owner1"), jsonReq(http.MethodPost, fmt.Sprintf("/contests/%s/invite/reset", contestID), nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"token":"fresh"}`, w.Body.String())
}

func TestResetInviteLink_InvalidContestID(t *testing.T) {
	w := doRequest(inviteRouter(mocks.NewInviteService(t), "owner1"), jsonReq(http.MethodPost, "/contests/bad/invite/reset", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestResetInviteLink_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrContestNotFound:     http.StatusNotFound,
		errs.ErrNotPlayer:           http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrContestFinalized:    http.StatusForbidden,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewInviteService(t)
		svc.EXPECT().ResetInviteLink(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(inviteRouter(svc, "owner1"), jsonReq(http.MethodPost, fmt.Sprintf("/contests/%s/invite/reset", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestGetInvitePreview_Success(t *testing.T) {
	svc := mocks.NewInviteService(t)
	svc.EXPECT().GetInvitePreview(mock.Anything, "abc123").
		Return(&model.InvitePreviewResponse{ContestName: "Super Bowl", OwnerName: "Olive O."}, nil)

	w := doRequest(inviteRouter(svc, ""), jsonReq(http.MethodGet, "/invites/abc123", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.InvitePreviewResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Super Bowl", resp.ContestName)
}

func TestGetInvitePreview_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrInviteNotFound:      http.StatusNotFound,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewInviteService(t)
		svc.EXPECT().GetInvitePreview(mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(inviteRouter(svc, ""), jsonReq(http.MethodGet, "/invites/tok", nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestJoinContest_Success(t *testing.T) {
	svc := mocks.NewInviteService(t)
	svc.EXPECT().Join(mock.Anything, "valid-token", "user1", mock.Anything).
		Return(&model.ContestPlayer{ID: uuid.New(), UserID: "user1", Role: model.PlayerRolePlayer}, nil)

	w := doRequest(inviteRouter(svc, "user1"), jsonReq(http.MethodPost, "/invites/valid-token/join", nil))
	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestJoinContest_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrInviteNotFound:      http.StatusNotFound,
		errs.ErrContestFinalized:    http.StatusForbidden,
		errs.ErrBannedFromContest:   http.StatusForbidden,
		errs.ErrAlreadyPlayer:       http.StatusConflict,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewInviteService(t)
		svc.EXPECT().Join(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(inviteRouter(svc, "user1"), jsonReq(http.MethodPost, "/invites/tok/join", nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}
