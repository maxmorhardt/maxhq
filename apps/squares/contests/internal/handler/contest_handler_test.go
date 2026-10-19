package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/server"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
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

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "owner1", Name: "NewContest", MaxSquares: 10}))
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

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "someone-else", Name: "Test", MaxSquares: 10}))
	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestCreateContest_AlreadyExists(t *testing.T) {
	createContestErr(t, errs.ErrContestAlreadyExists, http.StatusBadRequest)
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

	w := doRequest(r, jsonReq(http.MethodPost, "/contests", model.CreateContestRequest{Owner: "owner1", Name: "Test", MaxSquares: 10}))
	assert.Equal(t, wantCode, w.Code)
}

func TestUpdateContest_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().UpdateContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Contest{ID: contestID, Name: "Updated", Status: model.ContestStatusActive}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PATCH("/contests/:id", h.UpdateContest)

	home := "Eagles"
	w := doRequest(r, jsonReq(http.MethodPatch, fmt.Sprintf("/contests/%s", contestID), model.UpdateContestRequest{HomeTeam: &home}))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateContest_InvalidID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PATCH("/contests/:id", h.UpdateContest)

	req, _ := http.NewRequest(http.MethodPatch, "/contests/not-a-uuid", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Content-Type", "application/json")
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateContest_InvalidBody(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PATCH("/contests/:id", h.UpdateContest)

	req, _ := http.NewRequest(http.MethodPatch, fmt.Sprintf("/contests/%s", uuid.New()), bytes.NewReader([]byte(`{bad`)))
	req.Header.Set("Content-Type", "application/json")
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateContest_NotFound(t *testing.T) {
	updateContestErr(t, "owner1", gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestUpdateContest_Finalized(t *testing.T) {
	updateContestErr(t, "owner1", errs.ErrContestFinalized, http.StatusForbidden)
}
func TestUpdateContest_Forbidden(t *testing.T) {
	updateContestErr(t, "stranger", errs.ErrUnauthorizedContestEdit, http.StatusForbidden)
}
func TestUpdateContest_DatabaseUnavailable(t *testing.T) {
	updateContestErr(t, "owner1", errs.ErrDatabaseUnavailable, http.StatusInternalServerError)
}
func TestUpdateContest_OtherError(t *testing.T) {
	updateContestErr(t, "owner1", errs.ErrContestNotEditable, http.StatusBadRequest)
}

func updateContestErr(t *testing.T, user string, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().UpdateContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.PATCH("/contests/:id", h.UpdateContest)

	home := "Eagles"
	w := doRequest(r, jsonReq(http.MethodPatch, fmt.Sprintf("/contests/%s", uuid.New()), model.UpdateContestRequest{HomeTeam: &home}))
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
	deleteContestErr(t, "owner1", gorm.ErrRecordNotFound, http.StatusNotFound)
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

func TestStartContest_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().StartContest(mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Contest{ID: contestID, Status: model.ContestStatusQ1}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/start", h.StartContest)

	req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("/contests/%s/start", contestID), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestStartContest_InvalidID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/start", h.StartContest)

	req, _ := http.NewRequest(http.MethodPost, "/contests/not-valid/start", http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestStartContest_NotFound(t *testing.T) {
	startContestErr(t, gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestStartContest_OtherError(t *testing.T) {
	startContestErr(t, errs.ErrContestNotEditable, http.StatusBadRequest)
}

func startContestErr(t *testing.T, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().StartContest(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/start", h.StartContest)

	req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("/contests/%s/start", uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func TestRecordQuarterResult_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().RecordQuarterResult(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.QuarterResult{ContestID: contestID, Quarter: 1, HomeTeamScore: 7, AwayTeamScore: 3}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/quarter-results", h.RecordQuarterResult)

	w := doRequest(r, jsonReq(http.MethodPost, fmt.Sprintf("/contests/%s/quarter-results", contestID), model.QuarterResultRequest{HomeTeamScore: 7, AwayTeamScore: 3}))
	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestRecordQuarterResult_InvalidID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/quarter-results", h.RecordQuarterResult)

	w := doRequest(r, jsonReq(http.MethodPost, "/contests/bad/quarter-results", model.QuarterResultRequest{HomeTeamScore: 7, AwayTeamScore: 3}))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRecordQuarterResult_InvalidBody(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/quarter-results", h.RecordQuarterResult)

	req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("/contests/%s/quarter-results", uuid.New()), bytes.NewReader([]byte(`{bad`)))
	req.Header.Set("Content-Type", "application/json")
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRecordQuarterResult_AlreadyExists(t *testing.T) {
	recordQuarterErr(t, errs.ErrQuarterResultAlreadyExists, http.StatusBadRequest)
}
func TestRecordQuarterResult_Unauthorized(t *testing.T) {
	recordQuarterErr(t, errs.ErrUnauthorizedContestEdit, http.StatusForbidden)
}
func TestRecordQuarterResult_NotFound(t *testing.T) {
	recordQuarterErr(t, gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestRecordQuarterResult_InvalidData(t *testing.T) {
	recordQuarterErr(t, gorm.ErrInvalidData, http.StatusBadRequest)
}
func TestRecordQuarterResult_InternalError(t *testing.T) {
	recordQuarterErr(t, assert.AnError, http.StatusInternalServerError)
}

func recordQuarterErr(t *testing.T, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().RecordQuarterResult(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/quarter-results", h.RecordQuarterResult)

	w := doRequest(r, jsonReq(http.MethodPost, fmt.Sprintf("/contests/%s/quarter-results", uuid.New()), model.QuarterResultRequest{HomeTeamScore: 7, AwayTeamScore: 3}))
	assert.Equal(t, wantCode, w.Code)
}

func TestRollbackLastQuarterResult_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().RollbackLastQuarterResult(mock.Anything, mock.Anything, mock.Anything).
		Return(&model.QuarterResult{ContestID: contestID, Quarter: 1}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/quarter-results/latest", h.RollbackLastQuarterResult)

	w := doRequest(r, jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/quarter-results/latest", contestID), nil))
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRollbackLastQuarterResult_InvalidID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/quarter-results/latest", h.RollbackLastQuarterResult)

	w := doRequest(r, jsonReq(http.MethodDelete, "/contests/bad/quarter-results/latest", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRollbackLastQuarterResult_NotFound(t *testing.T) {
	rollbackQuarterErr(t, gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestRollbackLastQuarterResult_GameLinked(t *testing.T) {
	rollbackQuarterErr(t, errs.ErrContestIsGameLinked, http.StatusBadRequest)
}
func TestRollbackLastQuarterResult_NothingToRollback(t *testing.T) {
	rollbackQuarterErr(t, errs.ErrNoQuarterResultToRollback, http.StatusBadRequest)
}
func TestRollbackLastQuarterResult_Unauthorized(t *testing.T) {
	rollbackQuarterErr(t, errs.ErrUnauthorizedContestEdit, http.StatusForbidden)
}
func TestRollbackLastQuarterResult_InternalError(t *testing.T) {
	rollbackQuarterErr(t, assert.AnError, http.StatusInternalServerError)
}

func rollbackQuarterErr(t *testing.T, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().RollbackLastQuarterResult(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/quarter-results/latest", h.RollbackLastQuarterResult)

	w := doRequest(r, jsonReq(http.MethodDelete, fmt.Sprintf("/contests/%s/quarter-results/latest", uuid.New()), nil))
	assert.Equal(t, wantCode, w.Code)
}

func TestClaimSquare_Success(t *testing.T) {
	contestID, squareID := uuid.New(), uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, "owner1").
		Return(&model.Square{ID: squareID, ContestID: contestID, Value: "ABC", Owner: "owner1"}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PUT("/contests/:id/squares/:squareId/claim", h.ClaimSquare)

	req, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func claimSquareBadID(t *testing.T, target string) {
	t.Helper()
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PUT("/contests/:id/squares/:squareId/claim", h.ClaimSquare)

	req, _ := http.NewRequest(http.MethodPut, target, http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClaimSquare_InvalidContestID(t *testing.T) {
	claimSquareBadID(t, fmt.Sprintf("/contests/bad/squares/%s/claim", uuid.New()))
}
func TestClaimSquare_InvalidSquareID(t *testing.T) {
	claimSquareBadID(t, fmt.Sprintf("/contests/%s/squares/bad/claim", uuid.New()))
}

func TestClaimSquare_NotFound(t *testing.T) {
	claimSquareErr(t, "owner1", gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestClaimSquare_SquareNotEditable(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrSquareNotEditable, http.StatusForbidden)
}
func TestClaimSquare_UnauthorizedSquareEdit(t *testing.T) {
	claimSquareErr(t, "stranger", errs.ErrUnauthorizedSquareEdit, http.StatusForbidden)
}
func TestClaimSquare_MissingInitials(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrMissingInitials, http.StatusConflict)
}
func TestClaimSquare_SquareTaken(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrSquareTaken, http.StatusConflict)
}
func TestClaimSquare_ClaimsNotFound(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrClaimsNotFound, http.StatusUnauthorized)
}
func TestClaimSquare_DatabaseUnavailable(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrDatabaseUnavailable, http.StatusInternalServerError)
}
func TestClaimSquare_OtherError(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrInvalidSquareValue, http.StatusBadRequest)
}

func claimSquareErr(t *testing.T, user string, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.PUT("/contests/:id/squares/:squareId/claim", h.ClaimSquare)

	req, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/contests/%s/squares/%s/claim", uuid.New(), uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func TestClearSquare_Success(t *testing.T) {
	contestID, squareID := uuid.New(), uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClearSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Square{ID: squareID, ContestID: contestID}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/:squareId/claim", h.ClearSquare)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestClearSquare_InvalidContestID(t *testing.T) {
	clearSquareBadID(t, fmt.Sprintf("/contests/bad/squares/%s/claim", uuid.New()))
}
func TestClearSquare_InvalidSquareID(t *testing.T) {
	clearSquareBadID(t, fmt.Sprintf("/contests/%s/squares/bad/claim", uuid.New()))
}

func clearSquareBadID(t *testing.T, target string) {
	t.Helper()
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/:squareId/claim", h.ClearSquare)

	req, _ := http.NewRequest(http.MethodDelete, target, http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClearSquare_NotFound(t *testing.T) {
	clearSquareErr(t, "owner1", gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestClearSquare_Forbidden(t *testing.T) {
	clearSquareErr(t, "stranger", errs.ErrUnauthorizedSquareEdit, http.StatusForbidden)
}
func TestClearSquare_SquareNotEditable(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrSquareNotEditable, http.StatusForbidden)
}
func TestClearSquare_DatabaseUnavailable(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrDatabaseUnavailable, http.StatusInternalServerError)
}
func TestClearSquare_OtherError(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrInvalidSquareValue, http.StatusBadRequest)
}

func clearSquareErr(t *testing.T, user string, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClearSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.DELETE("/contests/:id/squares/:squareId/claim", h.ClearSquare)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", uuid.New(), uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func TestClearMySquares_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClearUserSquares(mock.Anything, mock.Anything, mock.Anything).
		Return([]model.Square{{ID: uuid.New(), ContestID: contestID}}, nil)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/claims", h.ClearMySquares)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/claims", contestID), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusOK, w.Code)
	var resp []model.Square
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Len(t, resp, 1)
}

func TestClearMySquares_InvalidContestID(t *testing.T) {
	h := NewContestHandler(mocks.NewContestService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/claims", h.ClearMySquares)

	req, _ := http.NewRequest(http.MethodDelete, "/contests/bad/squares/claims", http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClearMySquares_NotFound(t *testing.T) {
	clearMySquaresErr(t, gorm.ErrRecordNotFound, http.StatusNotFound)
}
func TestClearMySquares_SquareNotEditable(t *testing.T) {
	clearMySquaresErr(t, errs.ErrSquareNotEditable, http.StatusForbidden)
}
func TestClearMySquares_DatabaseUnavailable(t *testing.T) {
	clearMySquaresErr(t, errs.ErrDatabaseUnavailable, http.StatusInternalServerError)
}
func TestClearMySquares_OtherError(t *testing.T) {
	clearMySquaresErr(t, errs.ErrInvalidSquareValue, http.StatusBadRequest)
}

func clearMySquaresErr(t *testing.T, svcErr error, wantCode int) {
	t.Helper()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClearUserSquares(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewContestHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/claims", h.ClearMySquares)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/claims", uuid.New()), http.NoBody)
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

func postRandomClaim(svc *mocks.ContestService, contestID, body string) int {
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/squares/random", NewContestHandler(svc).ClaimRandomSquares)

	req, _ := http.NewRequest(http.MethodPost, "/contests/"+contestID+"/squares/random", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return doRequest(r, req).Code
}

func TestClaimRandomSquares_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewContestService(t)
	svc.EXPECT().ClaimRandomSquares(mock.Anything, contestID, 4, "owner1").
		Return(&model.RandomClaimResponse{Squares: []model.Square{{ID: uuid.New()}}, Requested: 4}, nil)

	assert.Equal(t, http.StatusOK, postRandomClaim(svc, contestID.String(), `{"count":4}`))
}

func TestClaimRandomSquares_RejectsBadInput(t *testing.T) {
	assert.Equal(t, http.StatusBadRequest, postRandomClaim(mocks.NewContestService(t), "nope", `{"count":1}`))
	for _, body := range []string{`{}`, `{"count":0}`, `{"count":101}`, `{`} {
		assert.Equal(t, http.StatusBadRequest, postRandomClaim(mocks.NewContestService(t), uuid.NewString(), body), body)
	}
}

func TestClaimRandomSquares_MapsErrors(t *testing.T) {
	cases := map[error]int{
		errs.ErrSquareNotEditable:      http.StatusForbidden,
		errs.ErrUnauthorizedSquareEdit: http.StatusForbidden,
		errs.ErrNotParticipant:         http.StatusForbidden,
		errs.ErrMissingInitials:        http.StatusConflict,
		errs.ErrNoEmptySquares:         http.StatusConflict,
		errs.ErrSquareLimitReached:     http.StatusConflict,
		errs.ErrClaimsNotFound:         http.StatusUnauthorized,
		assert.AnError:                 http.StatusInternalServerError,
	}
	for err, want := range cases {
		svc := mocks.NewContestService(t)
		svc.EXPECT().ClaimRandomSquares(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, err)
		assert.Equal(t, want, postRandomClaim(svc, uuid.NewString(), `{"count":1}`), err.Error())
	}
}

func patchContest(t *testing.T, svc *mocks.ContestService, ifMatch string) *http.Response {
	t.Helper()
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PATCH("/contests/:id", NewContestHandler(svc).UpdateContest)

	away := "B"
	req := jsonReq(http.MethodPatch, "/contests/"+uuid.NewString(), model.UpdateContestRequest{AwayTeam: &away})
	if ifMatch != "" {
		req.Header.Set("If-Match", ifMatch)
	}
	return doRequest(r, req).Result()
}

func TestUpdateContest_ReturnsETagAndPassesIfMatch(t *testing.T) {
	svc := mocks.NewContestService(t)
	svc.EXPECT().UpdateContest(mock.Anything, mock.Anything, mock.Anything, "owner1", mock.MatchedBy(func(v *int64) bool {
		return v != nil && *v == 3
	})).Return(&model.Contest{Version: 4}, nil)

	resp := patchContest(t, svc, `"3"`)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, `"4"`, resp.Header.Get("ETag"))
}

func TestUpdateContest_StaleIfMatchIsPreconditionFailed(t *testing.T) {
	svc := mocks.NewContestService(t)
	svc.EXPECT().UpdateContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrVersionConflict)

	assert.Equal(t, http.StatusPreconditionFailed, patchContest(t, svc, `"3"`).StatusCode)
}

func TestUpdateContest_ConflictWithoutIfMatch(t *testing.T) {
	svc := mocks.NewContestService(t)
	svc.EXPECT().UpdateContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything, (*int64)(nil)).Return(nil, errs.ErrVersionConflict)

	assert.Equal(t, http.StatusConflict, patchContest(t, svc, "").StatusCode)
}

func TestUpdateContest_MalformedIfMatch(t *testing.T) {
	assert.Equal(t, http.StatusBadRequest, patchContest(t, mocks.NewContestService(t), `"nope"`).StatusCode)
}

func TestStartContest_VersionConflict(t *testing.T) {
	svc := mocks.NewContestService(t)
	svc.EXPECT().StartContest(mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrVersionConflict)
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/start", NewContestHandler(svc).StartContest)

	w := doRequest(r, jsonReq(http.MethodPost, "/contests/"+uuid.NewString()+"/start", nil))

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestRecordQuarterResult_NewErrorMappings(t *testing.T) {
	for err, want := range map[error]int{
		errs.ErrContestNotEditable: http.StatusBadRequest,
		errs.ErrVersionConflict:    http.StatusConflict,
	} {
		svc := mocks.NewContestService(t)
		svc.EXPECT().RecordQuarterResult(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, err)
		r := gin.New()
		r.Use(authenticatedMiddleware("owner1"))
		r.POST("/contests/:id/quarter-results", NewContestHandler(svc).RecordQuarterResult)

		w := doRequest(r, jsonReq(http.MethodPost, "/contests/"+uuid.NewString()+"/quarter-results", model.QuarterResultRequest{HomeTeamScore: 7}))

		assert.Equal(t, want, w.Code, err.Error())
	}
}
