package worker

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newWorker(t *testing.T, espn *mocks.ESPNClient, gameSvc *mocks.GameService) *scoresWorker {
	t.Helper()
	w := newScoresWorker(espn, gameSvc, time.Minute, time.Hour)
	w.weekPause = 0
	return w
}

func week(season, seasonType, n int) model.Week {
	return model.Week{Season: season, SeasonType: seasonType, Week: n}
}

func game(id string, w model.Week, state string) model.ESPNGame {
	return model.ESPNGame{ESPNID: id, Season: w.Season, SeasonType: w.SeasonType, Week: w.Week, State: state}
}

func listed(weeks ...model.Week) []model.SeasonWeek {
	out := make([]model.SeasonWeek, 0, len(weeks))
	for _, w := range weeks {
		out = append(out, model.SeasonWeek{Week: w, Label: w.DefaultLabel()})
	}
	return out
}

// a 2026 season with two regular season weeks
func calendar(end time.Time) model.ESPNCalendar {
	return model.ESPNCalendar{Season: 2026, Weeks: listed(week(2026, 2, 1), week(2026, 2, 2)), End: end}
}

func ingested(gameSvc *mocks.GameService) *[]model.ESPNGame {
	var got []model.ESPNGame
	gameSvc.EXPECT().Ingest(mock.Anything, mock.Anything).
		Run(func(_ context.Context, games []model.ESPNGame) { got = games }).Return(0, nil)
	return &got
}

func savedCalendar(gameSvc *mocks.GameService) *[]model.SeasonWeek {
	var got []model.SeasonWeek
	gameSvc.EXPECT().SaveCalendar(mock.Anything, mock.Anything).
		Run(func(_ context.Context, weeks []model.SeasonWeek) { got = weeks }).Return(nil).Maybe()
	return &got
}

func ids(games []model.ESPNGame) []string {
	out := make([]string, 0, len(games))
	for i := range games {
		out = append(out, games[i].ESPNID)
	}
	return out
}

func TestScoresWorker_FirstRunSyncsTheWholeSeason(t *testing.T) {
	live := game("w2-live", week(2026, 2, 2), "in")
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return([]model.ESPNGame{live}, calendar(time.Now().Add(90*24*time.Hour)), nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2026, 2, 1)).
		Return([]model.ESPNGame{game("w1-final", week(2026, 2, 1), "post")}, model.ESPNCalendar{}, nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2026, 2, 2)).
		Return([]model.ESPNGame{game("w2-live", week(2026, 2, 2), "pre"), game("w2-later", week(2026, 2, 2), "pre")}, model.ESPNCalendar{}, nil)
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)
	saved := savedCalendar(gameSvc)

	w := newWorker(t, espn, gameSvc)
	require.NoError(t, w.run(context.Background()))

	assert.Equal(t, []string{"w1-final", "w2-live", "w2-later"}, ids(*got), "past weeks are backfilled and the schedule ahead loaded")
	assert.Equal(t, calendar(time.Time{}).Weeks, *saved, "the calendar is kept for naming and stepping through weeks")
	assert.Equal(t, "in", (*got)[1].State, "the current scoreboard wins over the slower sync")
	assert.False(t, w.lastSeasonSync.IsZero())
}

func TestScoresWorker_FollowsOnlyTheCurrentScoreboardBetweenSyncs(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return([]model.ESPNGame{game("1", week(2026, 2, 2), "in")}, calendar(time.Time{}), nil)
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)

	w := newWorker(t, espn, gameSvc)
	w.lastSeasonSync = time.Now()
	require.NoError(t, w.run(context.Background()))

	assert.Equal(t, []string{"1"}, ids(*got))
}

func TestScoresWorker_FailedSyncStillRecordsCurrentScores(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return([]model.ESPNGame{game("1", week(2026, 2, 2), "in")}, calendar(time.Time{}), nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2026, 2, 1)).Return(nil, model.ESPNCalendar{}, errors.New("espn down"))
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)

	w := newWorker(t, espn, gameSvc)
	require.NoError(t, w.run(context.Background()))

	assert.Equal(t, []string{"1"}, ids(*got))
	assert.True(t, w.lastSeasonSync.IsZero(), "the sync is tried again next run")
}

func TestScoresWorker_DropsGamesOutsideTheRequestedWeek(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, model.ESPNCalendar{Season: 2026, Weeks: listed(week(2026, 2, 1))}, nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2026, 2, 1)).
		Return([]model.ESPNGame{game("right", week(2026, 2, 1), "post"), game("stray", week(2026, 2, 7), "pre")}, model.ESPNCalendar{}, nil)
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)
	savedCalendar(gameSvc)

	require.NoError(t, newWorker(t, espn, gameSvc).run(context.Background()))
	assert.Equal(t, []string{"right"}, ids(*got))
}

func TestScoresWorker_AfterThePostseasonLoadsNextSeasonOncePublished(t *testing.T) {
	over := model.ESPNCalendar{Season: 2026, End: time.Now().Add(-24 * time.Hour)}
	next := model.ESPNCalendar{Season: 2027, Weeks: listed(week(2027, 1, 1), week(2027, 2, 1))}
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, over, nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2027, 2, 1)).
		Return([]model.ESPNGame{game("opener", week(2027, 2, 1), "pre")}, next, nil).Twice()
	espn.EXPECT().FetchWeek(mock.Anything, week(2027, 1, 1)).
		Return([]model.ESPNGame{game("hof", week(2027, 1, 1), "pre")}, next, nil)
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)
	saved := savedCalendar(gameSvc)

	require.NoError(t, newWorker(t, espn, gameSvc).run(context.Background()))
	assert.Equal(t, []string{"hof", "opener"}, ids(*got))
	assert.Equal(t, next.Weeks, *saved, "next season's calendar is kept once ESPN publishes it")
}

func TestScoresWorker_NextSeasonWithoutACalendarAssumesTheRegularSeason(t *testing.T) {
	over := model.ESPNCalendar{Season: 2026, End: time.Now().Add(-24 * time.Hour)}
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, over, nil)
	espn.EXPECT().FetchWeek(mock.Anything, mock.MatchedBy(func(w model.Week) bool { return w.Season == 2027 && w.SeasonType == 2 })).
		RunAndReturn(func(_ context.Context, w model.Week) ([]model.ESPNGame, model.ESPNCalendar, error) {
			return []model.ESPNGame{game("g"+string(rune('a'+w.Week)), w, "pre")}, over, nil
		})
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)
	saved := savedCalendar(gameSvc)

	require.NoError(t, newWorker(t, espn, gameSvc).run(context.Background()))
	assert.Len(t, *got, nextSeasonWeeks)
	assert.Empty(t, *saved, "a calendar from the old season is not kept for the new one")
	espn.AssertNumberOfCalls(t, "FetchWeek", 1+nextSeasonWeeks)
}

func TestScoresWorker_WaitsForNextSeasonToBePublished(t *testing.T) {
	over := model.ESPNCalendar{Season: 2026, End: time.Now().Add(-24 * time.Hour)}
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, over, nil)
	// ESPN answers a season it has not published with the one it has
	espn.EXPECT().FetchWeek(mock.Anything, week(2027, 2, 1)).
		Return([]model.ESPNGame{game("old", week(2026, 2, 1), "post")}, over, nil)
	gameSvc := mocks.NewGameService(t)
	got := ingested(gameSvc)
	savedCalendar(gameSvc)

	w := newWorker(t, espn, gameSvc)
	require.NoError(t, w.run(context.Background()))
	assert.Empty(t, *got)
	assert.False(t, w.lastSeasonSync.IsZero())
}

func TestScoresWorker_NextSeasonProbeErrorRetriesTheSync(t *testing.T) {
	over := model.ESPNCalendar{Season: 2026, End: time.Now().Add(-24 * time.Hour)}
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, over, nil)
	espn.EXPECT().FetchWeek(mock.Anything, week(2027, 2, 1)).Return(nil, model.ESPNCalendar{}, errors.New("espn down"))
	gameSvc := mocks.NewGameService(t)
	ingested(gameSvc)

	w := newWorker(t, espn, gameSvc)
	require.NoError(t, w.run(context.Background()))
	assert.True(t, w.lastSeasonSync.IsZero())
}

func TestScoresWorker_Run_FetchError(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, model.ESPNCalendar{}, errors.New("boom"))
	require.Error(t, newWorker(t, espn, mocks.NewGameService(t)).run(context.Background()))
}

func TestScoresWorker_Run_IngestErrorLeavesSeasonUnsynced(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return([]model.ESPNGame{{ESPNID: "1"}}, model.ESPNCalendar{}, nil)
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Ingest(mock.Anything, mock.Anything).Return(0, errors.New("db"))

	w := newWorker(t, espn, gameSvc)
	require.Error(t, w.run(context.Background()))
	assert.True(t, w.lastSeasonSync.IsZero())
}

func TestScoresWorker_RecordsNewScores(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return([]model.ESPNGame{{ESPNID: "1"}}, model.ESPNCalendar{}, nil)
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Ingest(mock.Anything, mock.Anything).Return(2, nil)
	savedCalendar(gameSvc)

	require.NoError(t, newWorker(t, espn, gameSvc).run(context.Background()))
}

func TestScoresWorker_CalendarSaveFailureRetriesTheSync(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchCurrent(mock.Anything).Return(nil, model.ESPNCalendar{}, nil)
	gameSvc := mocks.NewGameService(t)
	ingested(gameSvc)
	gameSvc.EXPECT().SaveCalendar(mock.Anything, mock.Anything).Return(errors.New("db"))

	w := newWorker(t, espn, gameSvc)
	require.Error(t, w.run(context.Background()))
	assert.True(t, w.lastSeasonSync.IsZero())
}

func TestScoresWorker_PausesBetweenWeeksAndStopsOnCancel(t *testing.T) {
	espn := mocks.NewESPNClient(t)
	espn.EXPECT().FetchWeek(mock.Anything, week(2026, 2, 1)).Return(nil, model.ESPNCalendar{}, nil).Once()
	w := newWorker(t, espn, mocks.NewGameService(t))
	w.weekPause = time.Hour

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, err := w.fetchWeeks(ctx, []model.Week{week(2026, 2, 1), week(2026, 2, 2)})
	assert.ErrorIs(t, err, context.DeadlineExceeded)
}

func TestScoresWorker_NextDelay_Live(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).Return(model.GameActivity{Live: true}, nil)

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	assert.Equal(t, w.activeInterval, w.nextDelay(context.Background()))
}

func TestScoresWorker_NextDelay_Idle(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).Return(model.GameActivity{}, nil)

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	assert.Equal(t, w.idleInterval, w.nextDelay(context.Background()))
}

func TestScoresWorker_NextDelay_KickoffImminent(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).
		Return(model.GameActivity{NextKickoff: time.Now().Add(10 * time.Second)}, nil)

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	assert.Equal(t, w.activeInterval, w.nextDelay(context.Background()))
}

func TestScoresWorker_NextDelay_WakesAtKickoff(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).
		Return(model.GameActivity{NextKickoff: time.Now().Add(30 * time.Minute)}, nil)

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	delay := w.nextDelay(context.Background())
	assert.Greater(t, delay, w.activeInterval)
	assert.LessOrEqual(t, delay, 30*time.Minute)
}

func TestScoresWorker_NextDelay_KickoffPassedStillScheduled(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).
		Return(model.GameActivity{NextKickoff: time.Now().Add(-5 * time.Minute)}, nil)

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	assert.Equal(t, w.activeInterval, w.nextDelay(context.Background()))
}

func TestScoresWorker_NextDelay_ActivityError(t *testing.T) {
	gameSvc := mocks.NewGameService(t)
	gameSvc.EXPECT().Activity(mock.Anything).Return(model.GameActivity{}, errors.New("db"))

	w := newWorker(t, mocks.NewESPNClient(t), gameSvc)
	assert.Equal(t, w.activeInterval, w.nextDelay(context.Background()))
}
