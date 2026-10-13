package consumer

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/contests/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/events"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/messaging"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	GamesDurable = "contests-games"
	UsersDurable = "contests-users"
)

var (
	GamesSpec = messaging.ConsumerSpec{Durable: GamesDurable, FilterSubjects: []string{events.GameSubjects}}
	UsersSpec = messaging.ConsumerSpec{Durable: UsersDurable, FilterSubjects: []string{events.UserSubjects}}
)

// game updates refresh contests' copy of the game and move linked contests forward
func GameHandler(gameSync service.GameSyncService) messaging.Handler {
	return func(ctx context.Context, msg jetstream.Msg) error {
		var event events.GameUpdated
		if err := json.Unmarshal(msg.Data(), &event); err != nil {
			// a payload that will never decode is acked and dropped rather than redelivered forever
			util.LoggerFromContext(ctx).Error("dropping undecodable game event", "error", err)
			return nil
		}

		return gameSync.ApplyGameUpdate(ctx, &event.Game)
	}
}

// profile changes cascade onto squares; deletions scrub the user from every contest
func UserHandler(userActivity service.UserActivityService) messaging.Handler {
	return func(ctx context.Context, msg jetstream.Msg) error {
		log := util.LoggerFromContext(ctx)

		switch msg.Subject() {
		case events.UserUpdatedSubject:
			var event events.UserUpdated
			if err := json.Unmarshal(msg.Data(), &event); err != nil {
				log.Error("dropping undecodable user updated event", "error", err)
				return nil
			}
			return userActivity.ApplyUserUpdated(ctx, &event)
		case events.UserDeletedSubject:
			var event events.UserDeleted
			if err := json.Unmarshal(msg.Data(), &event); err != nil {
				log.Error("dropping undecodable user deleted event", "error", err)
				return nil
			}
			return userActivity.ApplyUserDeleted(ctx, &event)
		default:
			log.Warn("ignoring unknown user event", "subject", fmt.Sprintf("%q", msg.Subject()))
			return nil
		}
	}
}
