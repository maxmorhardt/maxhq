package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
)

type ContestEventPublisher interface {
	PublishSquareUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, square *model.Square) error
	PublishContestUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, contest *model.Contest) error
	PublishQuarterResult(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult) error
	PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error
	PublishParticipantRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error
	PublishParticipantJoined(ctx context.Context, contestID uuid.UUID, participant *model.ContestParticipant) error
	PublishParticipantUpdated(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error
}

type contestEventPublisher struct {
	outbox streams.Outbox
}

func NewContestEventPublisher(outbox streams.Outbox) ContestEventPublisher {
	return &contestEventPublisher{outbox: outbox}
}

func (p *contestEventPublisher) PublishSquareUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, square *model.Square) error {
	return p.publish(ctx, events.SquareUpdatedType, contestID, updatedBy, square)
}

func (p *contestEventPublisher) PublishContestUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, contest *model.Contest) error {
	return p.publish(ctx, events.ContestUpdatedType, contestID, updatedBy, model.NewContestUpdate(contest))
}

func (p *contestEventPublisher) PublishQuarterResult(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult) error {
	return p.publish(ctx, events.QuarterRecordedType, contestID, updatedBy, quarterResult)
}

func (p *contestEventPublisher) PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error {
	return p.publish(ctx, events.ContestDeletedType, contestID, updatedBy, nil)
}

func (p *contestEventPublisher) PublishParticipantRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error {
	return p.publish(ctx, events.ParticipantRemovedType, contestID, updatedBy, participant)
}

func (p *contestEventPublisher) PublishParticipantJoined(ctx context.Context, contestID uuid.UUID, participant *model.ContestParticipant) error {
	return p.publish(ctx, events.ParticipantJoinedType, contestID, participant.UserID, participant)
}

func (p *contestEventPublisher) PublishParticipantUpdated(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error {
	return p.publish(ctx, events.ParticipantUpdatedType, contestID, updatedBy, participant)
}

func (p *contestEventPublisher) publish(ctx context.Context, eventType string, contestID uuid.UUID, updatedBy string, data any) error {
	event, err := events.NewContestEvent(eventType, contestID, updatedBy, data)
	if err != nil {
		return err
	}
	return p.outbox.Add(ctx, events.ContestStream(contestID), eventType, event)
}
