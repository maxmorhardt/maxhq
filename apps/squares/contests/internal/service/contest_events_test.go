package service_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func captureOutbox(t *testing.T, contestID uuid.UUID) (*mocks.Outbox, *[]*events.ContestEvent) {
	t.Helper()
	captured := []*events.ContestEvent{}
	ob := mocks.NewOutbox(t)
	ob.EXPECT().Add(mock.Anything, events.ContestStream(contestID), mock.Anything, mock.Anything).
		Run(func(_ context.Context, _, eventType string, payload any) {
			event := payload.(*events.ContestEvent)
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

	heavy := &model.Contest{ID: contestID, Name: "Bowl", Status: model.ContestStatusQ2, Squares: []model.Square{{}}, QuarterResults: []model.QuarterResult{{}}, Game: &model.Game{}}
	participant := &model.ContestParticipant{UserID: "p"}

	require.NoError(t, pub.PublishSquareUpdate(ctx, contestID, "u", &model.Square{}))
	require.NoError(t, pub.PublishContestUpdate(ctx, contestID, "u", heavy))
	require.NoError(t, pub.PublishQuarterResult(ctx, contestID, "u", &model.QuarterResult{Quarter: 1}))
	require.NoError(t, pub.PublishContestDeleted(ctx, contestID, "u"))
	require.NoError(t, pub.PublishParticipantRemoved(ctx, contestID, "u", participant))
	require.NoError(t, pub.PublishParticipantJoined(ctx, contestID, participant))

	types := make([]string, 0, len(*captured))
	for _, e := range *captured {
		types = append(types, e.Type)
		assert.Equal(t, contestID, e.ContestID)
	}
	assert.Equal(t, []string{
		events.SquareUpdatedType, events.ContestUpdatedType, events.QuarterRecordedType,
		events.ContestDeletedType, events.ParticipantRemovedType, events.ParticipantJoinedType,
	}, types)

	var update map[string]any
	require.NoError(t, json.Unmarshal((*captured)[1].Data, &update))
	assert.Equal(t, "Bowl", update["name"])
	assert.NotContains(t, update, "squares", "updates leave the grid to square events")
	assert.NotContains(t, update, "quarterResults")
	assert.NotContains(t, update, "game")

	assert.Nil(t, (*captured)[3].Data, "a deletion carries no payload")
	assert.Equal(t, "p", (*captured)[5].UpdatedBy, "a joiner is the one who changed the contest")
}
