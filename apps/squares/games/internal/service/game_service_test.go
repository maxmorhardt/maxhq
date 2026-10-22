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
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
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

func TestGameService_GetScoreboard_CurrentWeek(t *testing.T) {
	week := model.Week{Season: 2026, SeasonType: 2, Week: 7}
	g := mocks.NewGameRepository(t)
	g.EXPECT().CurrentWeek(mock.Anything).Return(&week, nil)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{{ESPNID: "1"}}, nil).Once()
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, nil).Maybe()
	svc := gameSvc(t, g, nil)

	first, err := svc.GetScoreboard(context.Background(), nil)
	require.NoError(t, err)
	second, err := svc.GetScoreboard(context.Background(), nil)
	require.NoError(t, err)

	assert.Equal(t, week, first.Week)
	assert.Len(t, first.Games, 1)
	assert.Equal(t, first, second, "the week's games are cached")
}

func TestGameService_GetScoreboard_NoGamesYet(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().CurrentWeek(mock.Anything).Return(nil, nil)

	board, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), nil)

	require.NoError(t, err)
	assert.Empty(t, board.Games)
}

func TestGameService_GetScoreboard_ChosenWeek(t *testing.T) {
	week := model.Week{Season: 2025, SeasonType: 3, Week: 4}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{}, nil)
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, nil).Maybe()

	board, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)

	require.NoError(t, err)
	assert.Equal(t, week, board.Week)
}

func TestGameService_GetScoreboard_Errors(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().CurrentWeek(mock.Anything).Return(nil, errors.New("db")).Once()
	_, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), nil)
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	week := model.Week{Season: 2026, SeasonType: 2, Week: 1}
	g = mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return(nil, errors.New("db"))
	_, err = gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestGameService_GetGame_CachesResult(t *testing.T) {
	id := uuid.New()
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetByID(mock.Anything, id).Return(&model.Game{ESPNID: "1", HomeScore: 7}, nil).Once()
	svc := gameSvc(t, g, nil)

	first, err := svc.GetGame(context.Background(), id)
	require.NoError(t, err)
	second, err := svc.GetGame(context.Background(), id)
	require.NoError(t, err)

	assert.Equal(t, 7, first.HomeScore)
	assert.Equal(t, first, second)
}

func TestGameService_GetGame_Errors(t *testing.T) {
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound).Once()
	_, err := gameSvc(t, g, nil).GetGame(context.Background(), uuid.New())
	assert.ErrorIs(t, err, errs.ErrGameNotFound)

	g.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, errors.New("db")).Once()
	_, err = gameSvc(t, g, nil).GetGame(context.Background(), uuid.New())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestGameService_Ingest_ChangedGameDropsItsCachedWeekAndGame(t *testing.T) {
	gameID := uuid.New()
	week := model.Week{Season: 2026, SeasonType: 2, Week: 7}
	stored := &model.Game{ID: gameID, Season: 2026, SeasonType: 2, Week: 7, HomeScore: 7}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{{ID: gameID}}, nil).Twice()
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, nil).Maybe()
	g.EXPECT().GetByID(mock.Anything, gameID).Return(stored, nil)
	g.EXPECT().Upsert(mock.Anything, mock.Anything).
		Run(func(_ context.Context, game *model.Game) { game.ID = gameID }).Return(true, nil).Once()
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	svc := gameSvc(t, g, ob)

	_, err := svc.GetScoreboard(context.Background(), &week)
	require.NoError(t, err)
	_, err = svc.GetGame(context.Background(), gameID)
	require.NoError(t, err)

	_, err = svc.Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1", State: "in"}})
	require.NoError(t, err)

	_, err = svc.GetScoreboard(context.Background(), &week)
	require.NoError(t, err)
	_, err = svc.GetGame(context.Background(), gameID)
	require.NoError(t, err)
	g.AssertNumberOfCalls(t, "GetByID", 3)
}

func TestGameService_Ingest_UnchangedGameKeepsTheCache(t *testing.T) {
	week := model.Week{Season: 2026, SeasonType: 2, Week: 7}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{}, nil).Once()
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, nil).Maybe()
	g.EXPECT().Upsert(mock.Anything, mock.Anything).Return(false, nil)
	svc := gameSvc(t, g, nil)

	_, err := svc.GetScoreboard(context.Background(), &week)
	require.NoError(t, err)
	_, err = svc.Ingest(context.Background(), []model.ESPNGame{{ESPNID: "1", State: "pre"}})
	require.NoError(t, err)
	_, err = svc.GetScoreboard(context.Background(), &week)
	require.NoError(t, err)
}

func TestGameService_GetScoreboard_NamesAndPlacesAListedWeek(t *testing.T) {
	week := model.Week{Season: 2026, SeasonType: 2, Week: 18}
	listed := &model.SeasonWeek{Week: week, Label: "Week 18", StartsAt: time.Date(2027, 1, 6, 8, 0, 0, 0, time.UTC)}
	before := model.Week{Season: 2026, SeasonType: 2, Week: 17}
	after := model.Week{Season: 2026, SeasonType: 3, Week: 1}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{}, nil)
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(listed, nil)
	g.EXPECT().NeighborWeeks(mock.Anything, listed).Return(&before, &after, nil)

	board, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)

	require.NoError(t, err)
	assert.Equal(t, "Week 18", board.Label)
	assert.Equal(t, &before, board.Previous)
	assert.Equal(t, &after, board.Next, "the regular season steps into the playoffs")
}

func TestGameService_GetScoreboard_UnlistedWeekGetsADefaultName(t *testing.T) {
	week := model.Week{Season: 2026, SeasonType: 3, Week: 2}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{}, nil)
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, nil)

	board, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)

	require.NoError(t, err)
	assert.Equal(t, "Postseason Week 2", board.Label)
	assert.Nil(t, board.Previous)
	assert.Nil(t, board.Next)
}

func TestGameService_GetScoreboard_CalendarErrors(t *testing.T) {
	week := model.Week{Season: 2026, SeasonType: 2, Week: 3}
	g := mocks.NewGameRepository(t)
	g.EXPECT().GetWeek(mock.Anything, week).Return([]model.Game{}, nil)
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(nil, errors.New("db")).Once()
	_, err := gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	listed := &model.SeasonWeek{Week: week, Label: "Week 3"}
	g.EXPECT().GetSeasonWeek(mock.Anything, week).Return(listed, nil).Once()
	g.EXPECT().NeighborWeeks(mock.Anything, listed).Return(nil, nil, errors.New("db"))
	_, err = gameSvc(t, g, nil).GetScoreboard(context.Background(), &week)
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestGameService_SaveCalendar(t *testing.T) {
	weeks := []model.SeasonWeek{{Week: model.Week{Season: 2026, SeasonType: 2, Week: 1}, Label: "Week 1"}}
	g := mocks.NewGameRepository(t)
	g.EXPECT().SaveCalendar(mock.Anything, weeks).Return(nil).Once()
	require.NoError(t, gameSvc(t, g, nil).SaveCalendar(context.Background(), weeks))

	g.EXPECT().SaveCalendar(mock.Anything, weeks).Return(errors.New("db"))
	assert.ErrorIs(t, gameSvc(t, g, nil).SaveCalendar(context.Background(), weeks), errs.ErrDatabaseUnavailable)
}
