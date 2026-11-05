package handler

import (
	"bytes"
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
)

func participantRouter(svc *mocks.ParticipantService) *gin.Engine {
	h := NewParticipantHandler(svc)
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.GET("/contests/:id/roster", h.GetRoster)
	r.POST("/contests/:id/participants/allot", h.AllotSquares)
	r.PATCH("/contests/:id/participants/:userId", h.UpdateParticipant)
	r.DELETE("/contests/:id/participants/:userId", h.RemoveParticipant)
	r.GET("/contests/:id/bans", h.GetBans)
	r.DELETE("/contests/:id/bans/:userId", h.Unban)
	return r
}

func rawJSON(method, target, body string) *http.Request {
	req, _ := http.NewRequest(method, target, bytes.NewReader([]byte(body)))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func TestGetRoster_Success(t *testing.T) {
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().GetRoster(mock.Anything, mock.Anything, "owner1").
		Return([]model.ParticipantIdentity{{UserID: "u_pat", FullName: "Pat Participant"}}, nil)

	w := doRequest(participantRouter(svc), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/roster", uuid.New()), nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `[{"userId":"u_pat","fullName":"Pat Participant"}]`, w.Body.String())
}

func TestGetRoster_InvalidContestID(t *testing.T) {
	w := doRequest(participantRouter(mocks.NewParticipantService(t)), jsonReq(http.MethodGet, "/contests/bad/roster", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetRoster_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrNotParticipant:      http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().GetRoster(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(participantRouter(svc), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/roster", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestUpdateParticipant_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().UpdateParticipant(mock.Anything, contestID, "user1", 0, "owner1").
		Return(&model.ContestParticipant{ID: uuid.New(), ContestID: contestID, UserID: "user1", Role: model.ParticipantRoleParticipant}, nil)

	w := doRequest(participantRouter(svc), rawJSON(http.MethodPatch, fmt.Sprintf("/contests/%s/participants/user1", contestID), `{"maxSquares":0}`))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateParticipant_InvalidRequest(t *testing.T) {
	path := fmt.Sprintf("/contests/%s/participants/user1", uuid.New())
	cases := []struct{ target, body string }{
		{"/contests/bad/participants/user1", `{"maxSquares":1}`},
		{path, `{bad`},
		{path, `{}`},
		{path, `{"maxSquares":-1}`},
		{path, `{"maxSquares":101}`},
	}
	for _, tc := range cases {
		w := doRequest(participantRouter(mocks.NewParticipantService(t)), rawJSON(http.MethodPatch, tc.target, tc.body))
		assert.Equal(t, http.StatusBadRequest, w.Code, tc.body)
	}
}

func TestUpdateParticipant_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrParticipantsLocked:  http.StatusForbidden,
		errs.ErrContestFinalized:    http.StatusForbidden,
		errs.ErrNotEnoughSquares:    http.StatusBadRequest,
		errs.ErrContestNotFound:     http.StatusNotFound,
		errs.ErrNotParticipant:      http.StatusNotFound,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().UpdateParticipant(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(participantRouter(svc), rawJSON(http.MethodPatch, fmt.Sprintf("/contests/%s/participants/user1", uuid.New()), `{"maxSquares":5}`))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestAllotSquares_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().AllotSquares(mock.Anything, contestID, 5, "owner1").
		Return([]model.ContestParticipant{{UserID: "user1", MaxSquares: 5}}, nil)

	w := doRequest(participantRouter(svc), rawJSON(http.MethodPost, fmt.Sprintf("/contests/%s/participants/allot", contestID), `{"maxSquares":5}`))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAllotSquares_InvalidRequest(t *testing.T) {
	cases := map[string]string{
		"/contests/bad/participants/allot":                         `{"maxSquares":5}`,
		fmt.Sprintf("/contests/%s/participants/allot", uuid.New()): `{"maxSquares":0}`,
	}
	for target, body := range cases {
		w := doRequest(participantRouter(mocks.NewParticipantService(t)), rawJSON(http.MethodPost, target, body))
		assert.Equal(t, http.StatusBadRequest, w.Code, target)
	}
}

func TestAllotSquares_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrNotEnoughSquares:    http.StatusBadRequest,
		errs.ErrParticipantsLocked:  http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrContestNotFound:     http.StatusNotFound,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().AllotSquares(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(participantRouter(svc), rawJSON(http.MethodPost, fmt.Sprintf("/contests/%s/participants/allot", uuid.New()), `{"maxSquares":5}`))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestRemoveParticipant_Success(t *testing.T) {
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().RemoveParticipant(mock.Anything, mock.Anything, "user1", "owner1").Return(nil)

	w := doRequest(participantRouter(svc), jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/participants/user1", uuid.New()), nil))
	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestRemoveParticipant_InvalidID(t *testing.T) {
	w := doRequest(participantRouter(mocks.NewParticipantService(t)), jsonReq(http.MethodDelete, "/contests/bad/participants/user1", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRemoveParticipant_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrCannotRemoveOwner:   http.StatusForbidden,
		errs.ErrContestFinalized:    http.StatusForbidden,
		errs.ErrContestNotFound:     http.StatusNotFound,
		errs.ErrNotParticipant:      http.StatusNotFound,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().RemoveParticipant(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(svcErr)

		w := doRequest(participantRouter(svc), jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/participants/user1", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestGetBans_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().GetBans(mock.Anything, contestID, "owner1").
		Return([]model.ContestBan{{UserID: "u_pat", DisplayName: "Pat Participant"}}, nil)

	w := doRequest(participantRouter(svc), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/bans", contestID), nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"displayName":"Pat Participant"`)
}

func TestGetBans_InvalidContestID(t *testing.T) {
	w := doRequest(participantRouter(mocks.NewParticipantService(t)), jsonReq(http.MethodGet, "/contests/bad/bans", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetBans_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrNotParticipant:      http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().GetBans(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)

		w := doRequest(participantRouter(svc), jsonReq(http.MethodGet, fmt.Sprintf("/contests/%s/bans", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}

func TestUnban_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewParticipantService(t)
	svc.EXPECT().Unban(mock.Anything, contestID, "u_pat", "owner1").Return(nil)

	w := doRequest(participantRouter(svc), jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/bans/u_pat", contestID), nil))
	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestUnban_InvalidContestID(t *testing.T) {
	w := doRequest(participantRouter(mocks.NewParticipantService(t)), jsonReq(http.MethodDelete, "/contests/bad/bans/u_pat", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUnban_Errors(t *testing.T) {
	cases := map[error]int{
		errs.ErrNotBanned:           http.StatusNotFound,
		errs.ErrNotParticipant:      http.StatusForbidden,
		errs.ErrInsufficientRole:    http.StatusForbidden,
		errs.ErrDatabaseUnavailable: http.StatusInternalServerError,
	}
	for svcErr, want := range cases {
		svc := mocks.NewParticipantService(t)
		svc.EXPECT().Unban(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(svcErr)

		w := doRequest(participantRouter(svc), jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/bans/u_pat", uuid.New()), nil))
		assert.Equal(t, want, w.Code, svcErr.Error())
	}
}
