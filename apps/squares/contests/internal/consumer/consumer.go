package consumer

import (
	"context"
	"encoding/json"

	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
)

var (
	GamesSpec = streams.ConsumerSpec{Name: "contests-games", Stream: events.GamesStream, LockKey: 910111}
	UsersSpec = streams.ConsumerSpec{Name: "contests-users", Stream: events.UsersStream, LockKey: 910112}
)

func GameHandler(gameSync service.GameSyncService) streams.Handler {
	return func(ctx context.Context, entry streams.Entry) error {
		log := logging.FromContext(ctx)

		if entry.Type != events.GameUpdatedType {
			log.Warn("ignoring unknown game event")
			return nil
		}

		var event events.GameUpdated
		if err := json.Unmarshal(entry.Data, &event); err != nil {
			// a payload that will never decode is skipped rather than retried forever
			log.Error("dropping undecodable game event", "error", err)
			return nil
		}

		return gameSync.ApplyGameUpdate(ctx, toProjection(&event.Game))
	}
}

func UserHandler(userActivity service.UserActivityService) streams.Handler {
	return func(ctx context.Context, entry streams.Entry) error {
		log := logging.FromContext(ctx)

		switch entry.Type {
		case events.UserUpdatedType:
			var event events.UserUpdated
			if err := json.Unmarshal(entry.Data, &event); err != nil {
				log.Error("dropping undecodable user updated event", "error", err)
				return nil
			}
			return userActivity.ApplyUserUpdated(ctx, &event)
		case events.UserDeletedType:
			var event events.UserDeleted
			if err := json.Unmarshal(entry.Data, &event); err != nil {
				log.Error("dropping undecodable user deleted event", "error", err)
				return nil
			}
			return userActivity.ApplyUserDeleted(ctx, &event)
		default:
			log.Warn("ignoring unknown user event")
			return nil
		}
	}
}

func toProjection(g *events.Game) *model.Game {
	scores := make([]model.GameScore, 0, len(g.Scores))
	for _, sc := range g.Scores {
		scores = append(scores, model.GameScore{ID: sc.ID, GameID: g.ID, Quarter: sc.Quarter, HomeScore: sc.HomeScore, AwayScore: sc.AwayScore})
	}

	return &model.Game{
		ID:         g.ID,
		ESPNID:     g.ESPNID,
		HomeTeam:   g.HomeTeam,
		AwayTeam:   g.AwayTeam,
		HomeAbbr:   g.HomeAbbr,
		AwayAbbr:   g.AwayAbbr,
		GameTime:   g.GameTime,
		Week:       g.Week,
		Season:     g.Season,
		SeasonType: g.SeasonType,
		Status:     model.GameStatus(g.Status),
		Period:     g.Period,
		HomeScore:  g.HomeScore,
		AwayScore:  g.AwayScore,
		Scores:     scores,
		UpdatedAt:  g.UpdatedAt,
	}
}
