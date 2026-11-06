package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/handler"
	"github.com/stretchr/testify/assert"
)

func feedInvalidations(t *testing.T, method, path string) int {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	invalidated := 0
	next := func(c *gin.Context) { c.Next() }
	Register(r, &Handlers{
		Contest:     handler.NewContestHandler(nil, nil),
		Square:      handler.NewSquareHandler(nil),
		Feed:        handler.NewFeedHandler(nil),
		Player:      handler.NewPlayerHandler(nil),
		Invite:      handler.NewInviteHandler(nil),
		Leaderboard: handler.NewLeaderboardHandler(nil),
		Stats:       handler.NewStatsHandler(nil),
		Internal:    handler.NewInternalHandler(nil, nil),
	}, Guards{
		Auth:       next,
		Internal:   next,
		FeedWrite:  func(c *gin.Context) { invalidated++; c.Next() },
		Idempotent: func(c *gin.Context) { c.AbortWithStatus(http.StatusNoContent) },
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(method, path, http.NoBody))
	assert.Equal(t, http.StatusNoContent, w.Code, path)
	return invalidated
}

func TestRegister_WritesThatChangeContestListsRefreshThem(t *testing.T) {
	cases := [][2]string{
		{http.MethodPost, "/contests"},
		{http.MethodPut, "/contests/c/squares/s/claim"},
		{http.MethodPatch, "/contests/c/players/u"},
		{http.MethodDelete, "/contests/c/players/u"},
		{http.MethodPost, "/invites/tok/join"},
	}
	for _, tc := range cases {
		assert.Equal(t, 1, feedInvalidations(t, tc[0], tc[1]), tc[1])
	}
}

func TestRegister_WritesThatLeaveContestListsAloneSkipTheRefresh(t *testing.T) {
	cases := [][2]string{
		{http.MethodPost, "/contests/c/players/allot"},
		{http.MethodDelete, "/contests/c/bans/u"},
		{http.MethodPost, "/contests/c/invite/reset"},
	}
	for _, tc := range cases {
		assert.Zero(t, feedInvalidations(t, tc[0], tc[1]), tc[1])
	}
}
