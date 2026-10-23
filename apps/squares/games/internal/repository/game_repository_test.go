package repository

import (
	"context"
	"database/sql/driver"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })

	mock.MatchExpectationsInOrder(false)

	gdb, err := gorm.Open(postgres.New(postgres.Config{
		Conn:                 sqlDB,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	return gdb, mock
}

func TestGameRepository_Upsert_Insert(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT .* FROM "games"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "games"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	changed, err := repo.Upsert(context.Background(), &model.Game{ESPNID: "401", GameTime: time.Now()})
	require.NoError(t, err)
	assert.True(t, changed, "a new game is always a change")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_Upsert_Update(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	existingID := uuid.New()
	mock.ExpectQuery(`SELECT .* FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "espn_id"}).AddRow(existingID, "401"))
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "games"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	game := &model.Game{ESPNID: "401", HomeScore: 7, GameTime: time.Now()}
	changed, err := repo.Upsert(context.Background(), game)
	require.NoError(t, err)
	assert.True(t, changed)
	assert.Equal(t, existingID, game.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_Upsert_UnchangedSkipsTheWrite(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	existingID := uuid.New()
	kickoff := time.Date(2026, 10, 18, 17, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`SELECT .* FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "espn_id", "home_team", "game_time", "status", "home_score"}).
			AddRow(existingID, "401", "Bills", kickoff, "in_progress", 7))

	game := &model.Game{ESPNID: "401", HomeTeam: "Bills", GameTime: kickoff, Status: model.GameStatusInProgress, HomeScore: 7}
	changed, err := repo.Upsert(context.Background(), game)

	require.NoError(t, err)
	assert.False(t, changed, "an identical scoreboard poll publishes nothing")
	assert.Equal(t, existingID, game.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_Upsert_LookupError(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT .* FROM "games"`).WillReturnError(assert.AnError)

	_, err := NewGameRepository(gdb).Upsert(context.Background(), &model.Game{ESPNID: "401"})

	require.ErrorIs(t, err, assert.AnError)
}

func TestGameRepository_GetByID(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	id := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "espn_id"}).AddRow(id, "401"))
	mock.ExpectQuery(`SELECT \* FROM "game_scores"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_id", "quarter"}).AddRow(id, 1))

	game, err := repo.GetByID(context.Background(), id)
	require.NoError(t, err)
	assert.Equal(t, "401", game.ESPNID)
	assert.Len(t, game.Scores, 1)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_GetUpcoming(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT "game_time" FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_time"}).AddRow(time.Now().Add(24 * time.Hour)))
	mock.ExpectQuery(`SELECT \* FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"espn_id"}).AddRow("1").AddRow("2"))

	games, err := repo.GetUpcoming(context.Background())
	require.NoError(t, err)
	assert.Len(t, games, 2)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_GetUpcoming_NoScheduledGames(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT "game_time" FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_time"}))

	games, err := repo.GetUpcoming(context.Background())
	require.NoError(t, err)
	assert.Empty(t, games)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_HasLiveGame(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT count\(\*\) FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	live, err := repo.HasLiveGame(context.Background())
	require.NoError(t, err)
	assert.True(t, live)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_HasLiveGame_None(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT count\(\*\) FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	live, err := repo.HasLiveGame(context.Background())
	require.NoError(t, err)
	assert.False(t, live)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_NextKickoff(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	want := time.Now().Add(3 * time.Hour)
	mock.ExpectQuery(`SELECT "game_time" FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_time"}).AddRow(want))

	got, err := repo.NextKickoff(context.Background())
	require.NoError(t, err)
	assert.WithinDuration(t, want, got, time.Second)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_NextKickoff_IncludesLateKickoff(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	late := time.Now().Add(-5 * time.Minute)
	mock.ExpectQuery(`SELECT "game_time" FROM "games" WHERE status = \$1 AND game_time > \$2`).
		WithArgs(string(model.GameStatusScheduled), beforeTime(time.Now().Add(-lateKickoffWindow+time.Minute)), 1).
		WillReturnRows(sqlmock.NewRows([]string{"game_time"}).AddRow(late))

	got, err := repo.NextKickoff(context.Background())
	require.NoError(t, err)
	assert.WithinDuration(t, late, got, time.Second)
	assert.NoError(t, mock.ExpectationsWereMet())
}

type beforeTime time.Time

func (b beforeTime) Match(v driver.Value) bool {
	t, ok := v.(time.Time)
	return ok && t.Before(time.Time(b))
}

func TestGameRepository_NextKickoff_None(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT "game_time" FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_time"}))

	got, err := repo.NextKickoff(context.Background())
	require.NoError(t, err)
	assert.True(t, got.IsZero())
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_UpsertScore_Created(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "game_scores"`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	created, err := repo.UpsertScore(context.Background(), &model.GameScore{GameID: uuid.New(), Quarter: 1, HomeScore: 7})
	require.NoError(t, err)
	assert.True(t, created)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_UpsertScore_Duplicate(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "game_scores"`).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	created, err := repo.UpsertScore(context.Background(), &model.GameScore{GameID: uuid.New(), Quarter: 1})
	require.NoError(t, err)
	assert.False(t, created)
	assert.NoError(t, mock.ExpectationsWereMet())
}

var weekColumns = []string{"season", "season_type", "week", "label", "starts_at", "ends_at"}

func TestGameRepository_CurrentWeek_TheCalendarWeekRunningNow(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at <= \$1 AND ends_at > \$2 ORDER BY starts_at DESC`).
		WillReturnRows(sqlmock.NewRows(weekColumns).AddRow(2026, 2, 7, "Week 7", time.Now(), time.Now()))

	week, err := repo.CurrentWeek(context.Background())
	require.NoError(t, err)
	assert.Equal(t, &model.Week{Season: 2026, SeasonType: 2, Week: 7}, week)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_CurrentWeek_OffseasonKeepsTheLastWeekThatEnded(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at <= \$1 AND ends_at > \$2`).
		WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE ends_at <= \$1 ORDER BY ends_at DESC`).
		WillReturnRows(sqlmock.NewRows(weekColumns).AddRow(2026, 3, 4, "Super Bowl", time.Now(), time.Now()))

	week, err := repo.CurrentWeek(context.Background())
	require.NoError(t, err)
	assert.Equal(t, &model.Week{Season: 2026, SeasonType: 3, Week: 4}, week)
}

func TestGameRepository_CurrentWeek_WithoutACalendarUsesTheNearestGame(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at`).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE ends_at`).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT "season","season_type","week" FROM "games" ORDER BY ABS`).
		WillReturnRows(sqlmock.NewRows([]string{"season", "season_type", "week"}).AddRow(2026, 2, 7))

	week, err := repo.CurrentWeek(context.Background())
	require.NoError(t, err)
	assert.Equal(t, &model.Week{Season: 2026, SeasonType: 2, Week: 7}, week)
}

func TestGameRepository_CurrentWeek_NoGames(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at`).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE ends_at`).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT "season","season_type","week" FROM "games"`).
		WillReturnRows(sqlmock.NewRows([]string{"season", "season_type", "week"}))

	week, err := repo.CurrentWeek(context.Background())
	require.NoError(t, err)
	assert.Nil(t, week)
}

func TestGameRepository_CurrentWeek_Errors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at`).WillReturnError(assert.AnError)
	_, err := NewGameRepository(gdb).CurrentWeek(context.Background())
	assert.Error(t, err)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at`).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE ends_at`).WillReturnError(assert.AnError)
	_, err = NewGameRepository(gdb).CurrentWeek(context.Background())
	assert.Error(t, err)
}

func TestGameRepository_SaveCalendar(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	require.NoError(t, repo.SaveCalendar(context.Background(), nil), "nothing to save is not a query")

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "season_weeks" .* ON CONFLICT \("season","season_type","week"\) DO UPDATE SET "label"="excluded"."label","starts_at"="excluded"."starts_at","ends_at"="excluded"."ends_at"`).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.SaveCalendar(context.Background(), []model.SeasonWeek{{Week: model.Week{Season: 2026, SeasonType: 2, Week: 1}, Label: "Week 1"}})
	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGameRepository_GetSeasonWeek(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)
	week := model.Week{Season: 2026, SeasonType: 3, Week: 4}

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE season = \$1 AND season_type = \$2 AND week = \$3`).
		WithArgs(2026, 3, 4, 1).
		WillReturnRows(sqlmock.NewRows(weekColumns).AddRow(2026, 3, 4, "Super Bowl", time.Now(), time.Now()))
	found, err := repo.GetSeasonWeek(context.Background(), week)
	require.NoError(t, err)
	assert.Equal(t, "Super Bowl", found.Label)

	mock.ExpectQuery(`SELECT \* FROM "season_weeks"`).WillReturnRows(sqlmock.NewRows(weekColumns))
	missing, err := repo.GetSeasonWeek(context.Background(), week)
	require.NoError(t, err)
	assert.Nil(t, missing)
}

func TestGameRepository_NeighborWeeks(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)
	week18 := &model.SeasonWeek{Week: model.Week{Season: 2026, SeasonType: 2, Week: 18}, StartsAt: time.Now()}

	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at < \$1 ORDER BY starts_at DESC`).
		WillReturnRows(sqlmock.NewRows(weekColumns).AddRow(2026, 2, 17, "Week 17", time.Now(), time.Now()))
	mock.ExpectQuery(`SELECT \* FROM "season_weeks" WHERE starts_at > \$1 ORDER BY starts_at ASC`).
		WillReturnRows(sqlmock.NewRows(weekColumns).AddRow(2026, 3, 1, "Wild Card", time.Now(), time.Now()))

	previous, next, err := repo.NeighborWeeks(context.Background(), week18)
	require.NoError(t, err)
	assert.Equal(t, &model.Week{Season: 2026, SeasonType: 2, Week: 17}, previous)
	assert.Equal(t, &model.Week{Season: 2026, SeasonType: 3, Week: 1}, next)
}

func TestGameRepository_NeighborWeeks_AtTheEndsAndOnErrors(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)
	only := &model.SeasonWeek{StartsAt: time.Now()}

	mock.ExpectQuery(`starts_at < `).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`starts_at > `).WillReturnRows(sqlmock.NewRows(weekColumns))
	previous, next, err := repo.NeighborWeeks(context.Background(), only)
	require.NoError(t, err)
	assert.Nil(t, previous)
	assert.Nil(t, next)

	mock.ExpectQuery(`starts_at < `).WillReturnError(assert.AnError)
	_, _, err = repo.NeighborWeeks(context.Background(), only)
	assert.Error(t, err)

	mock.ExpectQuery(`starts_at < `).WillReturnRows(sqlmock.NewRows(weekColumns))
	mock.ExpectQuery(`starts_at > `).WillReturnError(assert.AnError)
	_, _, err = repo.NeighborWeeks(context.Background(), only)
	assert.Error(t, err)
}

func TestGameRepository_GetWeek(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewGameRepository(gdb)

	id := uuid.New()
	mock.ExpectQuery(`SELECT \* FROM "games" WHERE season = \$1 AND season_type = \$2 AND week = \$3 ORDER BY game_time ASC`).
		WithArgs(2026, 2, 7).
		WillReturnRows(sqlmock.NewRows([]string{"id", "espn_id"}).AddRow(id, "401"))
	mock.ExpectQuery(`SELECT \* FROM "game_scores"`).
		WillReturnRows(sqlmock.NewRows([]string{"game_id", "quarter"}).AddRow(id, 1).AddRow(id, 2))

	games, err := repo.GetWeek(context.Background(), model.Week{Season: 2026, SeasonType: 2, Week: 7})
	require.NoError(t, err)
	require.Len(t, games, 1)
	assert.Len(t, games[0].Scores, 2)
	assert.NoError(t, mock.ExpectationsWereMet())
}
