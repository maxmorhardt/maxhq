package handler

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestParseIfMatch(t *testing.T) {
	five := int64(5)
	tests := []struct {
		header  string
		want    *int64
		wantErr bool
	}{
		{"", nil, false},
		{"*", nil, false},
		{`"5"`, &five, false},
		{`W/"5"`, &five, false},
		{"5", &five, false},
		{`"abc"`, nil, true},
		{`"0"`, nil, true},
		{`"-1"`, nil, true},
	}

	for _, tt := range tests {
		got, err := parseIfMatch(tt.header)
		if tt.wantErr {
			assert.Error(t, err, tt.header)
			continue
		}
		require.NoError(t, err, tt.header)
		assert.Equal(t, tt.want, got, tt.header)
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
		r.POST("/contests/:id/quarter-result", NewContestHandler(svc).RecordQuarterResult)

		w := doRequest(r, jsonReq(http.MethodPost, "/contests/"+uuid.NewString()+"/quarter-result", model.QuarterResultRequest{HomeTeamScore: 7}))

		assert.Equal(t, want, w.Code, err.Error())
	}
}
