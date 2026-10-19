package service_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func captureOutbox(t *testing.T, contestID uuid.UUID) (*mocks.Outbox, *[]*model.ContestEvent) {
	t.Helper()
	captured := []*model.ContestEvent{}
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, events.ContestStream(contestID), mock.Anything, mock.Anything).
		Run(func(_ context.Context, _, eventType string, payload any) {
			event := payload.(*model.ContestEvent)
			assert.Equal(t, event.Type, eventType, "the entry type matches the payload type")
			captured = append(captured, event)
		}).Return(nil)
	return ob, &captured
}

func TestContestEventPublisher_WritesEveryEventToTheContestStream(t *testing.T) {
	ctx := context.Background()
	contestID := uuid.New()
	ob, captured := captureOutbox(t, contestID)
	pub := service.NewContestEventPublisher(ob)

	heavy := &model.Contest{ID: contestID, Squares: []model.Square{{}}, QuarterResults: []model.QuarterResult{{}}, Game: &model.Game{}}
	participant := &model.ContestParticipant{UserID: "p"}

	require.NoError(t, pub.PublishSquareUpdate(ctx, contestID, "u", &model.Square{}))
	require.NoError(t, pub.PublishContestUpdate(ctx, contestID, "u", heavy))
	require.NoError(t, pub.PublishQuarterResult(ctx, contestID, "u", &model.QuarterResult{Quarter: 1}))
	require.NoError(t, pub.PublishQuarterResultRollback(ctx, contestID, "u", &model.QuarterResult{Quarter: 1}, heavy))
	require.NoError(t, pub.PublishContestDeleted(ctx, contestID, "u"))
	require.NoError(t, pub.PublishParticipantRemoved(ctx, contestID, "u", participant))
	require.NoError(t, pub.PublishParticipantAdded(ctx, contestID, participant))

	types := make([]string, 0, len(*captured))
	for _, e := range *captured {
		types = append(types, e.Type)
		assert.Equal(t, contestID, e.ContestID)
	}
	assert.Equal(t, []string{
		model.SquareUpdateType, model.ContestUpdateType, model.QuarterResultUpdateType,
		model.QuarterResultRollbackType, model.ContestDeletedType, model.ParticipantRemovedType, model.ParticipantAddedType,
	}, types)

	update := (*captured)[1].Contest
	assert.Nil(t, update.Squares)
	assert.Nil(t, update.QuarterResults)
	assert.Nil(t, update.Game)
	assert.Len(t, heavy.Squares, 1, "the caller's contest is not modified")
	assert.Nil(t, (*captured)[4].Contest)
}
