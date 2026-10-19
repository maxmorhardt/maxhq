package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func upcomingRouter(svc *mocks.GameService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/games/upcoming", NewGameHandler(svc).GetUpcoming)
	return r
}

func TestGetUpcoming(t *testing.T) {
	svc := mocks.NewGameService(t)
	svc.EXPECT().GetUpcoming(mock.Anything).Return([]model.Game{{ESPNID: "401", HomeTeam: "Bills"}}, nil)

	w := httptest.NewRecorder()
	upcomingRouter(svc).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/games/upcoming", http.NoBody))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"homeTeam":"Bills"`)
}

func TestGetUpcoming_Error(t *testing.T) {
	svc := mocks.NewGameService(t)
	svc.EXPECT().GetUpcoming(mock.Anything).Return(nil, errors.New("db"))

	w := httptest.NewRecorder()
	upcomingRouter(svc).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/games/upcoming", http.NoBody))

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
