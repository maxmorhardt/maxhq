package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// offseason shows week 1 while an in-season list stays capped to ~2 weeks of fixtures
const upcomingWindow = 14 * 24 * time.Hour

type GameRepository interface {
	Upsert(ctx context.Context, game *model.Game) (changed bool, err error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Game, error)
	GetUpcoming(ctx context.Context) ([]model.Game, error)

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

// liveColumns are the mutable fields refreshed from ESPN on every upsert
var liveColumns = []string{
	"home_team", "away_team", "home_abbr", "away_abbr", "game_time",
	"week", "season", "season_type", "status", "period", "home_score", "away_score",
}

// changed reports whether anything a subscriber cares about moved, so unchanged polls publish nothing
func (r *gameRepository) Upsert(ctx context.Context, game *model.Game) (bool, error) {
	conn := database.Conn(ctx, r.db)

	existing := &model.Game{}
	err := conn.Where("espn_id = ?", game.ESPNID).First(existing).Error
	if err == nil {
		// preserve identity, refresh the mutable fields in place
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
	return &game, err
}

func (r *gameRepository) GetUpcoming(ctx context.Context) ([]model.Game, error) {
	now := time.Now()
	conn := database.Conn(ctx, r.db)

	// only games that haven't kicked off yet can be linked to a new contest
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
		Where("status = ? AND game_time > ?", model.GameStatusScheduled, time.Now()).
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
