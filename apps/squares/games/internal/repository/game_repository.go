package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const upcomingWindow = 14 * 24 * time.Hour

// ESPN keeps a game pre for a few minutes past its listed kickoff, and a postponed one indefinitely
const lateKickoffWindow = 4 * time.Hour

type GameRepository interface {
	Upsert(ctx context.Context, game *model.Game) (changed bool, err error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Game, error)
	GetUpcoming(ctx context.Context) ([]model.Game, error)
	CurrentWeek(ctx context.Context) (*model.Week, error)
	GetWeek(ctx context.Context, week model.Week) ([]model.Game, error)

	SaveCalendar(ctx context.Context, weeks []model.SeasonWeek) error
	GetSeasonWeek(ctx context.Context, week model.Week) (*model.SeasonWeek, error)
	NeighborWeeks(ctx context.Context, week *model.SeasonWeek) (previous, next *model.Week, err error)

	UpsertScore(ctx context.Context, score *model.GameScore) (created bool, err error)

	HasLiveGame(ctx context.Context) (bool, error)
	NextKickoff(ctx context.Context) (time.Time, error)
}

type gameRepository struct {
	db *gorm.DB
}

func NewGameRepository(db *gorm.DB) GameRepository {
	return &gameRepository{db: db}
}

var liveColumns = []string{
	"home_team", "away_team", "home_abbr", "away_abbr", "game_time",
	"week", "season", "season_type", "status", "period", "home_score", "away_score",
}

func (r *gameRepository) Upsert(ctx context.Context, game *model.Game) (bool, error) {
	conn := database.Conn(ctx, r.db)

	existing := &model.Game{}
	err := conn.Where("espn_id = ?", game.ESPNID).First(existing).Error
	if err == nil {
		game.ID = existing.ID
		game.CreatedAt = existing.CreatedAt
		if sameLiveFields(existing, game) {
			game.UpdatedAt = existing.UpdatedAt
			return false, nil
		}
		return true, conn.Model(existing).Select(liveColumns).Updates(game).Error
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	return true, conn.Create(game).Error
}

func sameLiveFields(a, b *model.Game) bool {
	return a.HomeTeam == b.HomeTeam && a.AwayTeam == b.AwayTeam &&
		a.HomeAbbr == b.HomeAbbr && a.AwayAbbr == b.AwayAbbr &&
		a.GameTime.Equal(b.GameTime) && a.Week == b.Week && a.Season == b.Season &&
		a.SeasonType == b.SeasonType && a.Status == b.Status && a.Period == b.Period &&
		a.HomeScore == b.HomeScore && a.AwayScore == b.AwayScore
}

func (r *gameRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	var game model.Game
	err := database.Conn(ctx, r.db).
		Preload("Scores", func(db *gorm.DB) *gorm.DB { return db.Order("quarter ASC") }).
		First(&game, "id = ?", id).Error
	return &game, database.TranslateError(err)
}

func (r *gameRepository) GetUpcoming(ctx context.Context) ([]model.Game, error) {
	now := time.Now()
	conn := database.Conn(ctx, r.db)

	var nextKickoff []time.Time
	if err := conn.Model(&model.Game{}).
		Where("status = ? AND game_time > ?", model.GameStatusScheduled, now).
		Order("game_time ASC").Limit(1).
		Pluck("game_time", &nextKickoff).Error; err != nil {
		return nil, err
	}
	if len(nextKickoff) == 0 {
		return []model.Game{}, nil
	}

	var games []model.Game
	err := conn.
		Where("status = ? AND game_time > ? AND game_time <= ?",
			model.GameStatusScheduled, now, nextKickoff[0].Add(upcomingWindow)).
		Order("game_time ASC").
		Find(&games).Error
	return games, err
}

// the calendar week running now, else the last one that ended, so the Super Bowl stays up through the
// offseason until the next season's first week begins; with no calendar yet, the week of the nearest game
func (r *gameRepository) CurrentWeek(ctx context.Context) (*model.Week, error) {
	now := time.Now()
	db := database.Conn(ctx, r.db)

	var weeks []model.SeasonWeek
	if err := db.Where("starts_at <= ? AND ends_at > ?", now, now).Order("starts_at DESC").Limit(1).Find(&weeks).Error; err != nil {
		return nil, err
	}
	if len(weeks) == 0 {
		if err := db.Where("ends_at <= ?", now).Order("ends_at DESC").Limit(1).Find(&weeks).Error; err != nil {
			return nil, err
		}
	}
	if len(weeks) > 0 {
		return &weeks[0].Week, nil
	}

	return r.nearestGameWeek(ctx, now)
}

func (r *gameRepository) nearestGameWeek(ctx context.Context, now time.Time) (*model.Week, error) {
	var nearest []model.Game
	err := database.Conn(ctx, r.db).Model(&model.Game{}).
		Select("season", "season_type", "week").
		Order(clause.OrderBy{Expression: clause.Expr{
			SQL:  "ABS(EXTRACT(EPOCH FROM (game_time - ?)))",
			Vars: []any{now},
		}}).
		Limit(1).
		Find(&nearest).Error
	if err != nil || len(nearest) == 0 {
		return nil, err
	}

	return &model.Week{Season: nearest[0].Season, SeasonType: nearest[0].SeasonType, Week: nearest[0].Week}, nil
}

func (r *gameRepository) SaveCalendar(ctx context.Context, weeks []model.SeasonWeek) error {
	if len(weeks) == 0 {
		return nil
	}
	return database.Conn(ctx, r.db).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "season"}, {Name: "season_type"}, {Name: "week"}},
		DoUpdates: clause.AssignmentColumns([]string{"label", "starts_at", "ends_at"}),
	}).Create(&weeks).Error
}

// nil when the calendar does not list the week
func (r *gameRepository) GetSeasonWeek(ctx context.Context, week model.Week) (*model.SeasonWeek, error) {
	var found []model.SeasonWeek
	err := database.Conn(ctx, r.db).
		Where("season = ? AND season_type = ? AND week = ?", week.Season, week.SeasonType, week.Week).
		Limit(1).
		Find(&found).Error
	if err != nil || len(found) == 0 {
		return nil, err
	}
	return &found[0], nil
}

// the calendar weeks just before and after, which cross season phases and seasons
func (r *gameRepository) NeighborWeeks(ctx context.Context, week *model.SeasonWeek) (previous, next *model.Week, err error) {
	db := database.Conn(ctx, r.db)

	var before, after []model.SeasonWeek
	if err := db.Where("starts_at < ?", week.StartsAt).Order("starts_at DESC").Limit(1).Find(&before).Error; err != nil {
		return nil, nil, err
	}
	if err := db.Where("starts_at > ?", week.StartsAt).Order("starts_at ASC").Limit(1).Find(&after).Error; err != nil {
		return nil, nil, err
	}

	if len(before) > 0 {
		previous = &before[0].Week
	}
	if len(after) > 0 {
		next = &after[0].Week
	}
	return previous, next, nil
}

func (r *gameRepository) GetWeek(ctx context.Context, week model.Week) ([]model.Game, error) {
	var games []model.Game
	err := database.Conn(ctx, r.db).
		Preload("Scores", func(db *gorm.DB) *gorm.DB { return db.Order("quarter ASC") }).
		Where("season = ? AND season_type = ? AND week = ?", week.Season, week.SeasonType, week.Week).
		Order("game_time ASC").
		Find(&games).Error
	return games, err
}

func (r *gameRepository) HasLiveGame(ctx context.Context) (bool, error) {
	var count int64
	err := database.Conn(ctx, r.db).Model(&model.Game{}).
		Where("status = ?", model.GameStatusInProgress).
		Count(&count).Error
	return count > 0, err
}

func (r *gameRepository) NextKickoff(ctx context.Context) (time.Time, error) {
	var kickoff []time.Time
	err := database.Conn(ctx, r.db).Model(&model.Game{}).
		Where("status = ? AND game_time > ?", model.GameStatusScheduled, time.Now().Add(-lateKickoffWindow)).
		Order("game_time ASC").Limit(1).
		Pluck("game_time", &kickoff).Error
	if err != nil || len(kickoff) == 0 {
		return time.Time{}, err
	}
	return kickoff[0], nil
}

func (r *gameRepository) UpsertScore(ctx context.Context, score *model.GameScore) (bool, error) {
	res := database.Conn(ctx, r.db).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "game_id"}, {Name: "quarter"}},
			DoNothing: true,
		}).
		Create(score)
	if res.Error != nil {
		return false, res.Error
	}

	return res.RowsAffected > 0, nil
}
