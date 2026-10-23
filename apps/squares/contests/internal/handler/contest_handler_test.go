package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/server"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestCreateContest_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().CreateContest(mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Contest{ID: contestID, Name: "NewContest", Owner: "owner1", Status: model.ContestStatusActive}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests", h.CreateContest)

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "owner1", Name: "NewContest", MaxSquares: 10, GameID: uuid.NewString()}))
	assert.Equal(t, http.StatusCreated, w.Code)
	var resp model.Contest
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, contestID, resp.ID)
}

func jsonReq(method, target string, v any) *http.Request {
	body, _ := json.Marshal(v)
	req, _ := http.NewRequest(method, target, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func TestCreateContest_InvalidBody(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests", h.CreateContest)

	req, _ := http.NewRequest(http.MethodPost, "/contests", bytes.NewReader([]byte(`{invalid`)))
	req.Header.Set("Content-Type", "application/json")
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateContest_OwnerMismatch(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("user1"))
	r.POST("/contests", h.CreateContest)

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "someone-else", Name: "Test", MaxSquares: 10, GameID: uuid.NewString()}))
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestCreateContest_AlreadyExists(t *testing.T) {
	createContestErr(t, errs.ErrContestAlreadyExists, http.StatusConflict)
}
func TestCreateContest_DatabaseUnavailable(t *testing.T) {
	createContestErr(t, errs.ErrDatabaseUnavailable, http.StatusInternalServerError)
}
func TestCreateContest_InternalError(t *testing.T) {
	createContestErr(t, assert.AnError, http.StatusInternalServerError)
}

func createContestErr(t *testing.T, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().CreateContest(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests", h.CreateContest)

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "owner1", Name: "Test", MaxSquares: 10, GameID: uuid.NewString()}))
	assert.Equal(t, wantCode, w.Code)
}

func TestDeleteContest_Success(t *testing.T) {
	svc := mocks.NewContestService(t)
	svc.EXPECT().DeleteContest(mock.Anything, mock.Anything, mock.Anything).Return(nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id", h.DeleteContest)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s", uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestDeleteContest_InvalidID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id", h.DeleteContest)

	req, _ := http.NewRequest(http.MethodDelete, "/contests/bad-id", http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteContest_NotFound(t *testing.T) {
	deleteContestErr(t, "owner1", errs.ErrContestNotFound, http.StatusNotFound)
}
func TestDeleteContest_Finalized(t *testing.T) {
	deleteContestErr(t, "owner1", errs.ErrContestFinalized, http.StatusForbidden)
}
func TestDeleteContest_Forbidden(t *testing.T) {
	deleteContestErr(t, "stranger", errs.ErrUnauthorizedContestDelete, http.StatusForbidden)
}
func TestDeleteContest_InternalError(t *testing.T) {
	deleteContestErr(t, "owner1", assert.AnError, http.StatusInternalServerError)
}

func deleteContestErr(t *testing.T, user string, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().DeleteContest(mock.Anything, mock.Anything, mock.Anything).Return(svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.DELETE("/contests/:id", h.DeleteContest)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s", uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func authenticatedMiddleware(userID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := &api.Claims{Email: userID, EmailVerified: true, Name: "Test", Expire: 9999999999}
		api.SetContextValue(c, api.UserKey, userID)
		api.SetContextValue(c, api.ClaimsKey, claims)
		c.Next()
	}
}

func doRequest(r *gin.Engine, req *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	server.SetupValidators()
	server.RegisterValidation("contestname", util.ValidateContestName)
	os.Exit(m.Run())
}
