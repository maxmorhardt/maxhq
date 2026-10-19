package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
)

type FeedHandler interface {
	GetFeed(c *gin.Context)
}

type feedHandler struct {
	feedService service.FeedService
}

func NewFeedHandler(feedService service.FeedService) FeedHandler {
	return &feedHandler{feedService: feedService}
}

// GetFeed godoc
// @Summary List my contests
// @Description Contests the caller owns or has joined, newest first, one page at a time. Pass nextCursor back as cursor for the next page.
// @Tags contests
// @Produce json
// @Param cursor query string false "nextCursor from the previous page"
// @Param limit query int false "Page size" minimum(1) maximum(50) default(20)
// @Param role query string false "owned or joined" Enums(owned, joined)
// @Param status query string false "open, live, or finished" Enums(open, live, finished)
// @Param search query string false "Case-insensitive name filter"
// @Success 200 {object} model.ContestFeedResponse
// @Failure 400 {object} api.APIError
// @Failure 500 {object} api.APIError
// @Security BearerAuth
// @Router /contests [get]
func (h *feedHandler) GetFeed(c *gin.Context) {
	filter, err := parseFeedFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, api.Message(err), c))
		return
	}

	feed, err := h.feedService.List(c.Request.Context(), c.GetString(api.UserKey), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.NewAPIError(http.StatusInternalServerError, "Failed to get contests", c))
		return
	}

	c.JSON(http.StatusOK, feed)
}

func parseFeedFilter(c *gin.Context) (*model.ContestFeedFilter, error) {
	f := &model.ContestFeedFilter{
		Search: strings.TrimSpace(c.Query("search")),
		Limit:  model.DefaultFeedLimit,
	}

	if raw := c.Query("limit"); raw != "" {
		limit, err := strconv.Atoi(raw)
		if err != nil || limit < 1 || limit > model.MaxFeedLimit {
			return nil, errs.ErrInvalidLimit
		}
		f.Limit = limit
	}

	if raw := c.Query("cursor"); raw != "" {
		cursor, err := model.DecodeFeedCursor(raw)
		if err != nil {
			return nil, err
		}
		f.Cursor = cursor
	}

	switch role := model.FeedRole(c.Query("role")); role {
	case model.FeedRoleAll, model.FeedRoleOwned, model.FeedRoleJoined:
		f.Role = role
	default:
		return nil, errs.ErrInvalidFilter
	}

	if raw := c.Query("status"); raw != "" {
		statuses, ok := model.FeedStatusGroups[raw]
		if !ok {
			return nil, errs.ErrInvalidFilter
		}
		f.Statuses = statuses
	}

	return f, nil
}

func InvalidateFeeds(feedService service.FeedService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if c.Writer.Status() >= http.StatusBadRequest {
			return
		}

		ctx := c.Request.Context()
		feedService.Invalidate(ctx, c.GetString(api.UserKey), c.Param("userId"))
		if contestID, err := uuid.Parse(c.Param("id")); err == nil {
			feedService.InvalidateContest(ctx, contestID)
		}
	}
}
