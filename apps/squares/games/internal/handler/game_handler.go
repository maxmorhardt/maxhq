package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

type GameHandler interface {
	GetScoreboard(c *gin.Context)
	GetGame(c *gin.Context)
}

type gameHandler struct {
	gameService service.GameService
}

func NewGameHandler(gameService service.GameService) GameHandler {
	return &gameHandler{
		gameService: gameService,
	}
}

// @Summary Get the scoreboard
// @Description Returns one week of NFL games with their scores, by quarter. Without parameters it returns the week of the game nearest to now; pass season, seasonType, and week together to pick another.
// @Tags games
// @Produce json
// @Param season query int false "Season year"
// @Param seasonType query int false "1 preseason, 2 regular season, 3 postseason"
// @Param week query int false "Week of the season phase"
// @Param upcoming query bool false "Return the week of the next game that has not kicked off"
// @Success 200 {object} model.Scoreboard
// @Failure 400 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /games/scoreboard [get]
func (h *gameHandler) GetScoreboard(c *gin.Context) {
	log := logging.FromGin(c)

	week, ok := parseWeek(c)
	if !ok {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "season, seasonType, and week must be given together as positive numbers", c))
		return
	}

	var scoreboard *model.Scoreboard
	var err error
	if week == nil && c.Query("upcoming") == "true" {
		scoreboard, err = h.gameService.GetUpcomingScoreboard(c.Request.Context())
	} else {
		scoreboard, err = h.gameService.GetScoreboard(c.Request.Context(), week)
	}
	if err != nil {
		log.Error("failed to get scoreboard", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get scoreboard", c))
		return
	}

	c.JSON(http.StatusOK, scoreboard)
}

// @Summary Get a game
// @Description Returns one NFL game with its status, score, and points by quarter
// @Tags games
// @Produce json
// @Param id path string true "Game ID"
// @Success 200 {object} model.Game
// @Failure 400 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Router /games/{id} [get]
func (h *gameHandler) GetGame(c *gin.Context) {
	log := logging.FromGin(c)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Invalid game ID", c))
		return
	}

	game, err := h.gameService.GetGame(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, errs.ErrGameNotFound) {
			c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, "Game not found", c))
			return
		}
		log.Error("failed to get game", "game_id", id, "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get game", c))
		return
	}

	c.JSON(http.StatusOK, game)
}

// all three week parameters or none; anything else is a bad request
func parseWeek(c *gin.Context) (*model.Week, bool) {
	raw := []string{c.Query("season"), c.Query("seasonType"), c.Query("week")}
	if raw[0] == "" && raw[1] == "" && raw[2] == "" {
		return nil, true
	}

	values := make([]int, 0, len(raw))
	for _, r := range raw {
		v, err := strconv.Atoi(r)
		if err != nil || v < 1 {
			return nil, false
		}
		values = append(values, v)
	}

	return &model.Week{Season: values[0], SeasonType: values[1], Week: values[2]}, true
}
