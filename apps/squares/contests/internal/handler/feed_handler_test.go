package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func feedRouter(svc *mocks.FeedService) *gin.Engine {
	r := gin.New()
	r.GET("/contests", authenticatedMiddleware("user1"), NewFeedHandler(svc).GetFeed)
	return r
}

func getFeed(r *gin.Engine, query string) (code int, body []byte) {
	req, _ := http.NewRequest(http.MethodGet, "/contests?"+query, http.NoBody)
	w := doRequest(r, req)
	return w.Code, w.Body.Bytes()
}

func TestGetFeed_Defaults(t *testing.T) {
	svc := mocks.NewFeedService(t)
	want := &model.ContestFeedResponse{Contests: []model.ContestSummary{{ID: uuid.New(), Name: "c", Role: model.ParticipantRoleOwner}}, NextCursor: "next"}
	svc.EXPECT().List(mock.Anything, "user1", &model.ContestFeedFilter{Limit: model.DefaultFeedLimit}).Return(want, nil)

	code, body := getFeed(feedRouter(svc), "")

	require.Equal(t, http.StatusOK, code)
	var got model.ContestFeedResponse
	require.NoError(t, json.Unmarshal(body, &got))
	assert.Equal(t, "next", got.NextCursor)
	assert.Equal(t, model.ParticipantRoleOwner, got.Contests[0].Role)
}

func TestGetFeed_ParsesFilters(t *testing.T) {
	cursor := model.FeedCursor{At: time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC), ID: uuid.New()}

	svc := mocks.NewFeedService(t)
	svc.EXPECT().List(mock.Anything, "user1", mock.MatchedBy(func(f *model.ContestFeedFilter) bool {
		return f.Role == model.FeedRoleJoined &&
			f.Limit == 5 &&
			f.Search == "bowl" &&
			f.Cursor.ID == cursor.ID && f.Cursor.At.Equal(cursor.At) &&
			assert.ObjectsAreEqual([]model.ContestStatus{model.ContestStatusFinished}, f.Statuses)
	})).Return(&model.ContestFeedResponse{}, nil)

	code, _ := getFeed(feedRouter(svc), "role=joined&limit=5&search=%20bowl%20&status=finished&cursor="+cursor.Encode())

	assert.Equal(t, http.StatusOK, code)
}

func TestGetFeed_RejectsBadParams(t *testing.T) {
	for _, q := range []string{
		"limit=0", "limit=51", "limit=x",
		"cursor=abc",
		"role=admin",
		"status=pending", "status=open,live",
		"search=" + strings.Repeat("a", model.MaxFeedSearchLength+1),
	} {
		code, _ := getFeed(feedRouter(mocks.NewFeedService(t)), q)
		assert.Equal(t, http.StatusBadRequest, code, q)
	}
}

func TestGetFeed_ServiceError(t *testing.T) {
	svc := mocks.NewFeedService(t)
	svc.EXPECT().List(mock.Anything, mock.Anything, mock.Anything).Return(nil, assert.AnError)

	code, _ := getFeed(feedRouter(svc), "")

	assert.Equal(t, http.StatusInternalServerError, code)
}

func invalidationRouter(svc *mocks.FeedService, status int) *gin.Engine {
	r := gin.New()
	r.POST("/contests/:id/participants/:userId", authenticatedMiddleware("owner"), InvalidateFeeds(svc), func(c *gin.Context) {
		c.Status(status)
	})
	return r
}

func TestInvalidateFeeds_AfterSuccessfulWrite(t *testing.T) {
	contestID := uuid.New()
	svc := mocks.NewFeedService(t)
	svc.EXPECT().Invalidate(mock.Anything, "owner", "target").Once()
	svc.EXPECT().InvalidateContest(mock.Anything, contestID).Once()

	req, _ := http.NewRequest(http.MethodPost, "/contests/"+contestID.String()+"/participants/target", http.NoBody)
	doRequest(invalidationRouter(svc, http.StatusOK), req)
}

func TestInvalidateFeeds_SkipsFailedWrite(t *testing.T) {
	req, _ := http.NewRequest(http.MethodPost, "/contests/"+uuid.NewString()+"/participants/target", http.NoBody)
	doRequest(invalidationRouter(mocks.NewFeedService(t), http.StatusConflict), req)
}
