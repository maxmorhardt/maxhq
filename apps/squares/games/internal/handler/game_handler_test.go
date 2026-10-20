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

func scoreboardRouter(svc *mocks.GameService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/games/scoreboard", NewGameHandler(svc).GetScoreboard)
	return r
}

func getScoreboard(svc *mocks.GameService, target string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	scoreboardRouter(svc).ServeHTTP(w, httptest.NewRequest(http.MethodGet, target, http.NoBody))
	return w
}

func TestGetScoreboard_CurrentWeek(t *testing.T) {
	svc := mocks.NewGameService(t)
	svc.EXPECT().GetScoreboard(mock.Anything, (*model.Week)(nil)).
		Return(&model.Scoreboard{Week: model.Week{Season: 2026, SeasonType: 2, Week: 7}, Games: []model.Game{{HomeTeam: "Bills"}}}, nil)

	w := getScoreboard(svc, "/games/scoreboard")

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"week":7`)
	assert.Contains(t, w.Body.String(), `"homeTeam":"Bills"`)
}

func TestGetScoreboard_ChosenWeek(t *testing.T) {
	svc := mocks.NewGameService(t)
	svc.EXPECT().GetScoreboard(mock.Anything, &model.Week{Season: 2026, SeasonType: 3, Week: 2}).
		Return(&model.Scoreboard{}, nil)

	assert.Equal(t, http.StatusOK, getScoreboard(svc, "/games/scoreboard?season=2026&seasonType=3&week=2").Code)
}

func TestGetScoreboard_BadWeek(t *testing.T) {
	for _, target := range []string{
		"/games/scoreboard?week=3",
		"/games/scoreboard?season=2026&seasonType=2&week=zero",
		"/games/scoreboard?season=2026&seasonType=2&week=0",
	} {
		assert.Equal(t, http.StatusBadRequest, getScoreboard(mocks.NewGameService(t), target).Code, target)
	}
}

func TestGetScoreboard_Error(t *testing.T) {
	svc := mocks.NewGameService(t)
	svc.EXPECT().GetScoreboard(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	assert.Equal(t, http.StatusInternalServerError, getScoreboard(svc, "/games/scoreboard").Code)
}
