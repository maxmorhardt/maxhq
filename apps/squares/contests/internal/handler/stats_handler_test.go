package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestGetStats_Success(t *testing.T) {
	svc := mocks.NewStatsService(t)
	svc.EXPECT().GetSiteStats(mock.Anything).Return(&model.StatsResponse{ContestsCreatedToday: 5, SquaresClaimedToday: 42, TotalActiveContests: 12}, nil)

	r := gin.New()
	r.GET("/stats", NewStatsHandler(svc).GetStats)

	req, _ := http.NewRequest(http.MethodGet, "/stats", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp model.StatsResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, int64(5), resp.ContestsCreatedToday)
	assert.Equal(t, int64(42), resp.SquaresClaimedToday)
	assert.Equal(t, int64(12), resp.TotalActiveContests)
}

func TestGetStats_Error(t *testing.T) {
	svc := mocks.NewStatsService(t)
	svc.EXPECT().GetSiteStats(mock.Anything).Return(nil, assert.AnError)

	r := gin.New()
	r.GET("/stats", NewStatsHandler(svc).GetStats)

	req, _ := http.NewRequest(http.MethodGet, "/stats", http.NoBody)
	w := doRequest(r, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func myStatsRouter(svc *mocks.StatsService) *gin.Engine {
	r := gin.New()
	r.Use(authenticatedMiddleware("me@b.com"))
	r.GET("/stats/me", NewStatsHandler(svc).GetMyStats)
	return r
}

func TestGetMyStats(t *testing.T) {
	svc := mocks.NewStatsService(t)
	svc.EXPECT().GetUserStats(mock.Anything, "me@b.com").Return(&model.UserStatsResponse{QuarterWins: 2}, nil)

	w := doRequest(myStatsRouter(svc), jsonReq(http.MethodGet, "/stats/me", nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"quarterWins":2`)
}

func TestGetMyStats_Error(t *testing.T) {
	svc := mocks.NewStatsService(t)
	svc.EXPECT().GetUserStats(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	w := doRequest(myStatsRouter(svc), jsonReq(http.MethodGet, "/stats/me", nil))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
