package handler

import (
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/squares/internalapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func internalRouter(snapshots *mocks.SnapshotService, activity *mocks.UserActivityService) *gin.Engine {
	h := NewInternalHandler(snapshots, activity)
	r := gin.New()
	r.GET("/internal/contests/:id/snapshot", h.GetContestSnapshot)
	r.GET("/internal/users/:email/activity", h.GetUserActivity)
	return r
}

func TestGetContestSnapshot(t *testing.T) {
	contestID := uuid.New()
	snapshots := mocks.NewSnapshotService(t)
	snapshots.EXPECT().GetSnapshot(mock.Anything, contestID, "v@b.com").
		Return(&model.ContestSnapshot{Contest: &model.Contest{ID: contestID}}, nil)

	w := doRequest(internalRouter(snapshots, nil), jsonReq(http.MethodGet, "/internal/contests/"+contestID.String()+"/snapshot?user=v%40b.com", nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), contestID.String())
}

func TestGetContestSnapshot_Errors(t *testing.T) {
	tests := []struct {
		err  error
		want int
	}{
		{errs.ErrContestNotFound, http.StatusNotFound},
		{errs.ErrInsufficientRole, http.StatusForbidden},
		{errors.New("db"), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		snapshots := mocks.NewSnapshotService(t)
		snapshots.EXPECT().GetSnapshot(mock.Anything, mock.Anything, mock.Anything).Return(nil, tt.err)

		w := doRequest(internalRouter(snapshots, nil), jsonReq(http.MethodGet, "/internal/contests/"+uuid.NewString()+"/snapshot?user=v", nil))

		assert.Equal(t, tt.want, w.Code, tt.err.Error())
	}
}

func TestGetContestSnapshot_BadRequest(t *testing.T) {
	r := internalRouter(mocks.NewSnapshotService(t), nil)

	assert.Equal(t, http.StatusBadRequest, doRequest(r, jsonReq(http.MethodGet, "/internal/contests/nope/snapshot?user=v", nil)).Code)
	assert.Equal(t, http.StatusBadRequest, doRequest(r, jsonReq(http.MethodGet, "/internal/contests/"+uuid.NewString()+"/snapshot", nil)).Code)
}

func TestGetUserActivity(t *testing.T) {
	activity := mocks.NewUserActivityService(t)
	activity.EXPECT().GetActivitySummary(mock.Anything, "a@b.com").
		Return(&internalapi.UserActivitySummary{ActiveContests: []internalapi.UserActiveContest{}}, nil)

	w := doRequest(internalRouter(nil, activity), jsonReq(http.MethodGet, "/internal/users/a@b.com/activity", nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.JSONEq(t, `{"activeContests":[]}`, w.Body.String())
}

func TestGetUserActivity_Error(t *testing.T) {
	activity := mocks.NewUserActivityService(t)
	activity.EXPECT().GetActivitySummary(mock.Anything, mock.Anything).Return(nil, errs.ErrDatabaseUnavailable)

	w := doRequest(internalRouter(nil, activity), jsonReq(http.MethodGet, "/internal/users/a@b.com/activity", nil))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
