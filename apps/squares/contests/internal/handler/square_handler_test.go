package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
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

func TestClaimSquare_Success(t *testing.T) {
	contestID, squareID := uuid.New(), uuid.New()
	svc := mocks.NewSquareService(t)
	svc.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, "owner1").
		Return(&model.Square{ID: squareID, ContestID: contestID, Value: "ABC", Owner: "owner1"}, nil)
	h := NewSquareHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.PUT("/contests/:id/squares/:squareId/claim", h.ClaimSquare)

	req, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/contests/%s/squares/%s/claim", contestID, squareID), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusOK, w.Code)
}

func claimSquareBadID(t *testing.T, target string) {
	t.Helper()
	h := NewSquareHandler(mocks.NewSquareService(t))
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
	claimSquareErr(t, "owner1", errs.ErrContestNotFound, http.StatusNotFound)
}

func TestClaimSquare_SquareNotFound(t *testing.T) {
	claimSquareErr(t, "owner1", errs.ErrSquareNotFound, http.StatusNotFound)
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
	svc := mocks.NewSquareService(t)
	svc.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewSquareHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.PUT("/contests/:id/squares/:squareId/claim", h.ClaimSquare)

	req, _ := http.NewRequest(http.MethodPut, fmt.Sprintf("/contests/%s/squares/%s/claim", uuid.New(), uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func TestClearSquare_Success(t *testing.T) {
	contestID, squareID := uuid.New(), uuid.New()
	svc := mocks.NewSquareService(t)
	svc.EXPECT().Clear(mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Square{ID: squareID, ContestID: contestID}, nil)
	h := NewSquareHandler(svc)

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
	h := NewSquareHandler(mocks.NewSquareService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/:squareId/claim", h.ClearSquare)

	req, _ := http.NewRequest(http.MethodDelete, target, http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClearSquare_NotFound(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrContestNotFound, http.StatusNotFound)
}

func TestClearSquare_SquareNotFound(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrSquareNotFound, http.StatusNotFound)
}

func TestClearSquare_Forbidden(t *testing.T) {
	clearSquareErr(t, "stranger", errs.ErrUnauthorizedSquareEdit, http.StatusForbidden)
}

func TestClearSquare_BoardLocked(t *testing.T) {
	clearSquareErr(t, "owner1", errs.ErrBoardLocked, http.StatusConflict)
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
	svc := mocks.NewSquareService(t)
	svc.EXPECT().Clear(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewSquareHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware(user))
	r.DELETE("/contests/:id/squares/:squareId/claim", h.ClearSquare)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/%s/claim", uuid.New(), uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func TestClearMySquares_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewSquareService(t)
	svc.EXPECT().ClearByOwner(mock.Anything, mock.Anything, mock.Anything).
		Return([]model.Square{{ID: uuid.New(), ContestID: contestID}}, nil)
	h := NewSquareHandler(svc)

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
	h := NewSquareHandler(mocks.NewSquareService(t))
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/claims", h.ClearMySquares)

	req, _ := http.NewRequest(http.MethodDelete, "/contests/bad/squares/claims", http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClearMySquares_BoardLocked(t *testing.T) {
	clearMySquaresErr(t, errs.ErrBoardLocked, http.StatusConflict)
}

func TestClearMySquares_NotFound(t *testing.T) {
	clearMySquaresErr(t, errs.ErrContestNotFound, http.StatusNotFound)
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
	svc := mocks.NewSquareService(t)
	svc.EXPECT().ClearByOwner(mock.Anything, mock.Anything, mock.Anything).Return(nil, svcErr)
	h := NewSquareHandler(svc)

	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.DELETE("/contests/:id/squares/claims", h.ClearMySquares)

	req, _ := http.NewRequest(http.MethodDelete, fmt.Sprintf("/contests/%s/squares/claims", uuid.New()), http.NoBody)
	w := doRequest(r, req)
	assert.Equal(t, wantCode, w.Code)
}

func postRandomClaim(svc *mocks.SquareService, contestID, body string) int {
	r := gin.New()
	r.Use(authenticatedMiddleware("owner1"))
	r.POST("/contests/:id/squares/random", NewSquareHandler(svc).ClaimRandomSquares)

	req, _ := http.NewRequest(http.MethodPost, "/contests/"+contestID+"/squares/random", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return doRequest(r, req).Code
}

func TestClaimRandomSquares_Success(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewSquareService(t)
	svc.EXPECT().ClaimRandom(mock.Anything, contestID, 4, "owner1").
		Return(&model.RandomClaimResponse{Squares: []model.Square{{ID: uuid.New()}}, Requested: 4}, nil)

	assert.Equal(t, http.StatusOK, postRandomClaim(svc, contestID.String(), `{"count":4}`))
}

func TestClaimRandomSquares_RejectsBadInput(t *testing.T) {
	assert.Equal(t, http.StatusBadRequest, postRandomClaim(mocks.NewSquareService(t), "nope", `{"count":1}`))
	for _, body := range []string{`{}`, `{"count":0}`, `{"count":101}`, `{`} {
		assert.Equal(t, http.StatusBadRequest, postRandomClaim(mocks.NewSquareService(t), uuid.NewString(), body), body)
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
		svc := mocks.NewSquareService(t)
		svc.EXPECT().ClaimRandom(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, err)
		assert.Equal(t, want, postRandomClaim(svc, uuid.NewString(), `{"count":1}`), err.Error())
	}
}
