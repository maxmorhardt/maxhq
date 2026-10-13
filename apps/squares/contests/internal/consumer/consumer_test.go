package consumer_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/consumer"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/libs/go/platform/streams"
	"github.com/maxmorhardt/maxstash/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func entry(t *testing.T, eventType string, payload any) streams.Entry {
	t.Helper()
	data, err := json.Marshal(payload)
	require.NoError(t, err)
	return streams.Entry{ID: "1-0", Type: eventType, Data: data}
}

func TestGameHandler_AppliesGameUpdatesAsProjections(t *testing.T) {
	gameID := uuid.New()
	kickoff := time.Now().Truncate(time.Second)
	sync := mocks.NewGameSyncService(t)
	sync.EXPECT().ApplyGameUpdate(mock.Anything, mock.MatchedBy(func(g *model.Game) bool {
		return g.ID == gameID && g.Status == model.GameStatusInProgress && g.GameTime.Equal(kickoff) &&
			len(g.Scores) == 1 && g.Scores[0].GameID == gameID && g.Scores[0].HomeScore == 7
	})).Return(nil)

	err := consumer.GameHandler(sync)(context.Background(), entry(t, events.GameUpdatedType, events.GameUpdated{Game: events.Game{
		ID: gameID, Status: events.GameStatusInProgress, GameTime: kickoff,
		Scores: []events.GameScore{{ID: uuid.New(), Quarter: 1, HomeScore: 7, AwayScore: 3}},
	}}))

	require.NoError(t, err)
}

func TestGameHandler_PropagatesErrorsForRetry(t *testing.T) {
	sync := mocks.NewGameSyncService(t)
	sync.EXPECT().ApplyGameUpdate(mock.Anything, mock.Anything).Return(errors.New("db"))

	err := consumer.GameHandler(sync)(context.Background(), entry(t, events.GameUpdatedType, events.GameUpdated{}))

	assert.Error(t, err)
}

func TestGameHandler_SkipsUndecodableAndUnknownEntries(t *testing.T) {
	handle := consumer.GameHandler(mocks.NewGameSyncService(t))

	assert.NoError(t, handle(context.Background(), streams.Entry{Type: events.GameUpdatedType, Data: []byte("{")}))
	assert.NoError(t, handle(context.Background(), entry(t, "game.cancelled", map[string]string{})))
}

func TestUserHandler_RoutesByType(t *testing.T) {
	activity := mocks.NewUserActivityService(t)
	activity.EXPECT().ApplyUserUpdated(mock.Anything, &events.UserUpdated{Email: "a@b.com", DefaultInitials: "AB"}).Return(nil).Once()
	activity.EXPECT().ApplyUserDeleted(mock.Anything, mock.MatchedBy(func(e *events.UserDeleted) bool { return e.Email == "a@b.com" })).Return(nil).Once()
	handle := consumer.UserHandler(activity)

	require.NoError(t, handle(context.Background(), entry(t, events.UserUpdatedType, events.UserUpdated{Email: "a@b.com", DefaultInitials: "AB"})))
	require.NoError(t, handle(context.Background(), entry(t, events.UserDeletedType, events.UserDeleted{Email: "a@b.com"})))
	require.NoError(t, handle(context.Background(), entry(t, "user.renamed", map[string]string{})))
}

func TestUserHandler_SkipsUndecodablePayloads(t *testing.T) {
	handle := consumer.UserHandler(mocks.NewUserActivityService(t))

	assert.NoError(t, handle(context.Background(), streams.Entry{Type: events.UserUpdatedType, Data: []byte("{")}))
	assert.NoError(t, handle(context.Background(), streams.Entry{Type: events.UserDeletedType, Data: []byte("{")}))
}

func TestSpecsUseDistinctLocks(t *testing.T) {
	assert.NotEqual(t, consumer.GamesSpec.LockKey, consumer.UsersSpec.LockKey)
	assert.Equal(t, events.GamesStream, consumer.GamesSpec.Stream)
	assert.Equal(t, events.UsersStream, consumer.UsersSpec.Stream)
}
