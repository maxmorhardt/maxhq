package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
)

type GameHandler interface {
	GetUpcoming(c *gin.Context)
	GetScoreboard(c *gin.Context)
}

type gameHandler struct {
	gameService service.GameService
}

func NewGameHandler(gameService service.GameService) GameHandler {
	return &gameHandler{
		gameService: gameService,
	}
}

// @Summary Get upcoming games
// @Description Returns NFL games available to link a contest to when creating one
// @Tags games
// @Produce json
// @Success 200 {array} model.Game
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /games/upcoming [get]
func (h *gameHandler) GetUpcoming(c *gin.Context) {
	log := logging.FromGin(c)

	games, err := h.gameService.GetUpcoming(c.Request.Context())
	if err != nil {
		log.Error("failed to get upcoming games", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get upcoming games", c))
		return
	}

	c.JSON(http.StatusOK, games)
}

// @Summary Get the scoreboard
// @Description Returns one week of NFL games with their scores, by quarter. Without parameters it returns the week of the game nearest to now; pass season, seasonType, and week together to pick another.
// @Tags games
// @Produce json
// @Param season query int false "Season year"
// @Param seasonType query int false "1 preseason, 2 regular season, 3 postseason"
// @Param week query int false "Week of the season phase"
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

	scoreboard, err := h.gameService.GetScoreboard(c.Request.Context(), week)
	if err != nil {
		log.Error("failed to get scoreboard", "error", err)
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get scoreboard", c))
		return
	}

	c.JSON(http.StatusOK, scoreboard)
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
