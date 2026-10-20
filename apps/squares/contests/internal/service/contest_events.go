package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/squares/events"
)

type ContestEventPublisher interface {
	PublishSquareUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, square *model.Square) error
	PublishContestUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, contest *model.Contest) error
	PublishQuarterResult(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult) error
	PublishQuarterResultRollback(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult, contest *model.Contest) error
	PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error
	PublishParticipantRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error
	PublishParticipantAdded(ctx context.Context, contestID uuid.UUID, participant *model.ContestParticipant) error
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

func (p *contestEventPublisher) PublishQuarterResultRollback(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult, contest *model.Contest) error {
	rollback := model.QuarterRollback{Quarter: quarterResult.Quarter, Status: contest.Status}
	return p.publish(ctx, events.QuarterRolledBackType, contestID, updatedBy, rollback)
}

func (p *contestEventPublisher) PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error {
	return p.publish(ctx, events.ContestDeletedType, contestID, updatedBy, nil)
}

func (p *contestEventPublisher) PublishParticipantRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error {
	return p.publish(ctx, events.ParticipantRemovedType, contestID, updatedBy, participant)
}

func (p *contestEventPublisher) PublishParticipantAdded(ctx context.Context, contestID uuid.UUID, participant *model.ContestParticipant) error {
	return p.publish(ctx, events.ParticipantJoinedType, contestID, participant.UserID, participant)
}

func (p *contestEventPublisher) publish(ctx context.Context, eventType string, contestID uuid.UUID, updatedBy string, data any) error {
	event, err := events.NewContestEvent(eventType, contestID, updatedBy, data)
	if err != nil {
		return err
	}
	return p.outbox.Add(ctx, events.ContestStream(contestID), eventType, event)
}
