package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/service"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func passTx() *mocks.Transactor {
	m := &mocks.Transactor{}
	m.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }).Maybe()
	return m
}

type memCache struct {
	entries map[string][]byte
}

func (m *memCache) Get(_ context.Context, key string) (value []byte, found bool, err error) {
	value, found = m.entries[key]
	return value, found, nil
}

func (m *memCache) Set(_ context.Context, key string, value []byte, _ time.Duration) error {
	m.entries[key] = value
	return nil
}

func (m *memCache) Delete(_ context.Context, keys ...string) error {
	for _, k := range keys {
		delete(m.entries, k)
	}
	return nil
}

func gameSvc(t *testing.T, g *mocks.GameRepository, ob *mocks.Outbox) service.GameService {
	t.Helper()
	if ob == nil {
		ob = mocks.NewOutbox(t)
	}
	return service.NewGameService(g, passTx(), ob, &memCache{entries: map[string][]byte{}})
}

func TestGameService_GetUpcoming_CachesResult(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetUpcoming(mock.Anything).Return([]model.Game{{ESPNID: "1"}, {ESPNID: "2"}}, nil).Once()

	svc := gameSvc(t, g, nil)
	first, err := svc.GetUpcoming(context.Background())
	require.NoError(t, err)
	second, err := svc.GetUpcoming(context.Background())
	require.NoError(t, err)

	assert.Len(t, first, 2)
	assert.Equal(t, first, second)
}

func TestGameService_GetUpcoming_DBError(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetUpcoming(mock.Anything).Return(nil, errors.New("boom"))

	_, err := gameSvc(t, g, nil).GetUpcoming(context.Background())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestGameService_Ingest_UnchangedGamePublishesNothing(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().Upsert(mock.Anything, mock.Anything).Return(false, nil).Once()

	newScores, err := gameSvc(t, g, nil).Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1", State: "pre"}})

	require.NoError(t, err)
	assert.Zero(t, newScores)
}

func TestGameService_Ingest_ChangedGamePublishesTheStoredGame(t *testing.T) {
	gameID := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().Upsert(mock.Anything, mock.Anything).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).
		Return(true, nil).Once()
	g.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID, Status: model.GameStatusScheduled}, nil)
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, events.GamesStream, events.GameUpdatedType, events.GameUpdated{Game: events.Game{ID: gameID, Status: events.GameStatusScheduled, Scores: []events.GameScore{}}}).Return(nil).Once()

	newScores, err := gameSvc(t, g, ob).Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1", State: "pre"}})

	require.NoError(t, err)
	assert.Zero(t, newScores)
}

func TestGameService_Ingest_NewQuarterScorePublishesEvenIfRowUnchanged(t *testing.T) {
	gameID := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().Upsert(mock.Anything, mock.Anything).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).
		Return(false, nil)
	g.EXPECT().UpsertScore(mock.Anything, mock.MatchedBy(func(s *model.GameScore) bool { return s.Quarter == 1 && s.GameID == gameID })).Return(true, nil).Once()
	g.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID, Status: model.GameStatusInProgress}, nil)
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, events.GamesStream, events.GameUpdatedType, mock.Anything).Return(nil).Once()

	games := []model.ESPNGame{{ESPNID: "1", State: "in", Period: 2, HomeLine: []int{7}, AwayLine: []int{3}}}
	newScores, err := gameSvc(t, g, ob).Ingest(context.Background(), games)

	require.NoError(t, err)
	assert.Equal(t, 1, newScores)
}

func TestGameService_Ingest_FailuresSkipOnlyThatGame(t *testing.T) {
	gameID := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(game *model.Game) bool { return game.ESPNID == "bad" })).Return(false, errors.New("db"))
	g.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(game *model.Game) bool { return game.ESPNID == "score-fails" })).Return(false, nil)
	g.EXPECT().UpsertScore(mock.Anything, mock.Anything).Return(false, errors.New("db"))
	g.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(game *model.Game) bool { return game.ESPNID == "reload-fails" })).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).Return(true, nil)
	g.EXPECT().GetByID(mock.Anything, gameID).Return(nil, errors.New("db"))

	games := []model.ESPNGame{
		{ESPNID: "bad"},
		{ESPNID: "score-fails", State: "in", Period: 2, HomeLine: []int{7}, AwayLine: []int{3}},
		{ESPNID: "reload-fails"},
	}
	newScores, err := gameSvc(t, g, nil).Ingest(context.Background(), games)

	require.NoError(t, err)
	assert.Zero(t, newScores)
}

func TestGameService_Ingest_OutboxFailureSkipsTheGame(t *testing.T) {
	gameID := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().Upsert(mock.Anything, mock.Anything).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).Return(true, nil)
	g.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID}, nil)
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))

	newScores, err := gameSvc(t, g, ob).Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1"}})

	require.NoError(t, err)
	assert.Zero(t, newScores)
}

func TestGameService_Activity(t *testing.T) {
	kickoff := time.Now().Add(time.Hour)
	g := mocks.NewGameRepository(t)
	g.EXPECT().HasLiveGame(mock.Anything).Return(true, nil)
	g.EXPECT().NextKickoff(mock.Anything).Return(kickoff, nil)

	act, err := gameSvc(t, g, nil).Activity(context.Background())

	require.NoError(t, err)
	assert.True(t, act.Live)
	assert.Equal(t, kickoff, act.NextKickoff)
}

func TestGameService_Activity_Errors(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().HasLiveGame(mock.Anything).Return(false, errors.New("db"))
	_, err := gameSvc(t, g, nil).Activity(context.Background())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	g = mocks.NewGameRepository(t)
	g.EXPECT().HasLiveGame(mock.Anything).Return(false, nil)
	g.EXPECT().NextKickoff(mock.Anything).Return(time.Time{}, errors.New("db"))
	_, err = gameSvc(t, g, nil).Activity(context.Background())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestGameService_Ingest_ChangedGameRefreshesTheUpcomingList(t *testing.T) {
	gameID := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetUpcoming(mock.Anything).Return([]model.Game{}, nil).Once()
	g.EXPECT().Upsert(mock.Anything, mock.Anything).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).Return(true, nil).Once()
	g.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID}, nil)
	g.EXPECT().GetUpcoming(mock.Anything).Return([]model.Game{{ID: gameID}}, nil).Once()
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	svc := gameSvc(t, g, ob)

	before, err := svc.GetUpcoming(context.Background())
	require.NoError(t, err)
	assert.Empty(t, before)

	_, err = svc.Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1", State: "pre"}})
	require.NoError(t, err)

	after, err := svc.GetUpcoming(context.Background())
	require.NoError(t, err)
	assert.Len(t, after, 1, "the cached list was dropped when the game arrived")
}
