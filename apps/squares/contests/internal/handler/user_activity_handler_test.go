package handler

import (
	"errors"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/squares/internalapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func userActivityRouter(svc *mocks.UserActivityService) *gin.Engine {
	h := NewUserActivityHandler(svc)
	r := gin.New()
	r.Use(authenticatedMiddleware("me@b.com"))
	r.GET("/users/me/stats", h.GetMyStats)
	r.GET("/users/me/active-contests", h.GetMyActiveContests)
	return r
}

func TestGetMyStats(t *testing.T) {
	svc := mocks.NewUserActivityService(t)
	svc.EXPECT().GetStats(mock.Anything, "me@b.com").Return(&model.UserStatsResponse{QuarterWins: 2}, nil)

	w := doRequest(userActivityRouter(svc), jsonReq(http.MethodGet, "/users/me/stats", nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"quarterWins":2`)
}

func TestGetMyStats_Error(t *testing.T) {
	svc := mocks.NewUserActivityService(t)
	svc.EXPECT().GetStats(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	w := doRequest(userActivityRouter(svc), jsonReq(http.MethodGet, "/users/me/stats", nil))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestGetMyActiveContests(t *testing.T) {
	svc := mocks.NewUserActivityService(t)
	svc.EXPECT().GetActiveContests(mock.Anything, "me@b.com").Return([]internalapi.UserActiveContest{{Name: "C"}}, nil)

	w := doRequest(userActivityRouter(svc), jsonReq(http.MethodGet, "/users/me/active-contests", nil))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"name":"C"`)
}

func TestGetMyActiveContests_Error(t *testing.T) {
	svc := mocks.NewUserActivityService(t)
	svc.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	w := doRequest(userActivityRouter(svc), jsonReq(http.MethodGet, "/users/me/active-contests", nil))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
