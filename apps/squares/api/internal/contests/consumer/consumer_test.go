package consumer_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/consumer"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type fakeMsg struct {
	jetstream.Msg
	subject string
	data    []byte
}

func (m fakeMsg) Subject() string { return m.subject }
func (m fakeMsg) Data() []byte    { return m.data }

func msg(t *testing.T, subject string, payload any) fakeMsg {
	t.Helper()
	data, err := json.Marshal(payload)
	require.NoError(t, err)
	return fakeMsg{subject: subject, data: data}
}

func TestGameHandler_AppliesGameUpdates(t *testing.T) {
	gameID := uuid.New()
	sync := mocks.NewGameSyncService(t)
	sync.EXPECT().ApplyGameUpdate(mock.Anything, mock.MatchedBy(func(g *model.Game) bool { return g.ID == gameID })).Return(nil)

	err := consumer.GameHandler(sync)(context.Background(), msg(t, events.GameSubject(gameID), events.GameUpdated{Game: model.Game{ID: gameID}}))

	require.NoError(t, err)
}

func TestGameHandler_PropagatesErrorsForRedelivery(t *testing.T) {
	sync := mocks.NewGameSyncService(t)
	sync.EXPECT().ApplyGameUpdate(mock.Anything, mock.Anything).Return(errors.New("db"))

	err := consumer.GameHandler(sync)(context.Background(), msg(t, "squares.games.x", events.GameUpdated{}))

	assert.Error(t, err)
}

func TestGameHandler_DropsUndecodablePayloads(t *testing.T) {
	err := consumer.GameHandler(mocks.NewGameSyncService(t))(context.Background(), fakeMsg{subject: "squares.games.x", data: []byte("{")})

	assert.NoError(t, err)
}

func TestUserHandler_RoutesBySubject(t *testing.T) {
	activity := mocks.NewUserActivityService(t)
	activity.EXPECT().ApplyUserUpdated(mock.Anything, &events.UserUpdated{Email: "a@b.com", DefaultInitials: "AB"}).Return(nil).Once()
	activity.EXPECT().ApplyUserDeleted(mock.Anything, mock.MatchedBy(func(e *events.UserDeleted) bool { return e.Email == "a@b.com" })).Return(nil).Once()
	handle := consumer.UserHandler(activity)

	require.NoError(t, handle(context.Background(), msg(t, events.UserUpdatedSubject, events.UserUpdated{Email: "a@b.com", DefaultInitials: "AB"})))
	require.NoError(t, handle(context.Background(), msg(t, events.UserDeletedSubject, events.UserDeleted{Email: "a@b.com"})))
	require.NoError(t, handle(context.Background(), msg(t, "squares.users.renamed", map[string]string{})))
}

func TestUserHandler_DropsUndecodablePayloads(t *testing.T) {
	handle := consumer.UserHandler(mocks.NewUserActivityService(t))

	assert.NoError(t, handle(context.Background(), fakeMsg{subject: events.UserUpdatedSubject, data: []byte("{")}))
	assert.NoError(t, handle(context.Background(), fakeMsg{subject: events.UserDeletedSubject, data: []byte("{")}))
}
