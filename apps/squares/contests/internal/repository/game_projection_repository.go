package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GameProjectionRepository interface {
	Upsert(ctx context.Context, game *model.Game) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Game, error)
}

type gameProjectionRepository struct {
	db *gorm.DB
}

func NewGameProjectionRepository(db *gorm.DB) GameProjectionRepository {
	return &gameProjectionRepository{db: db}
}

var gameColumns = []string{
	"espn_id", "home_team", "away_team", "home_abbr", "away_abbr", "game_time",
	"week", "season", "season_type", "status", "period", "home_score", "away_score", "updated_at",
}

func (r *gameProjectionRepository) Upsert(ctx context.Context, game *model.Game) error {
	return database.Conn(ctx, r.db).Transaction(func(tx *gorm.DB) error {
		row := *game
		row.Scores = nil

		// an older snapshot never overwrites a newer one, even if events arrive out of order
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns(gameColumns),
			Where: clause.Where{Exprs: []clause.Expression{
				clause.Expr{SQL: "games.updated_at IS NULL OR excluded.updated_at >= games.updated_at"},
			}},
		}).Create(&row).Error; err != nil {
			return err
		}

		if len(game.Scores) == 0 {
			return nil
		}

		scores := make([]model.GameScore, len(game.Scores))
		copy(scores, game.Scores)
		for i := range scores {
			scores[i].GameID = game.ID
		}

		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "game_id"}, {Name: "quarter"}},
			DoUpdates: clause.AssignmentColumns([]string{"home_score", "away_score", "updated_at"}),
		}).Create(&scores).Error
	})
}

func (r *gameProjectionRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	var game model.Game
	err := database.Conn(ctx, r.db).
		Preload("Scores", func(db *gorm.DB) *gorm.DB { return db.Order("quarter ASC") }).
		First(&game, "id = ?", id).Error
	return &game, err
}
