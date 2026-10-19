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
	return p.publish(ctx, model.NewSquareUpdateEvent(contestID, updatedBy, square))
}

func (p *contestEventPublisher) PublishContestUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, contest *model.Contest) error {
	return p.publish(ctx, model.NewContestUpdateEvent(contestID, updatedBy, lightweight(contest)))
}

func (p *contestEventPublisher) PublishQuarterResult(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult) error {
	return p.publish(ctx, model.NewQuarterResultUpdateEvent(contestID, updatedBy, quarterResult))
}

func (p *contestEventPublisher) PublishQuarterResultRollback(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult, contest *model.Contest) error {
	return p.publish(ctx, model.NewQuarterResultRollbackEvent(contestID, updatedBy, quarterResult, lightweight(contest)))
}

func (p *contestEventPublisher) PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error {
	return p.publish(ctx, model.NewContestDeletedEvent(contestID, updatedBy))
}

func (p *contestEventPublisher) PublishParticipantRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, participant *model.ContestParticipant) error {
	return p.publish(ctx, model.NewParticipantRemovedEvent(contestID, updatedBy, participant))
}

func (p *contestEventPublisher) PublishParticipantAdded(ctx context.Context, contestID uuid.UUID, participant *model.ContestParticipant) error {
	return p.publish(ctx, model.NewParticipantAddedEvent(contestID, participant))
}

func (p *contestEventPublisher) publish(ctx context.Context, event *model.ContestEvent) error {
	return p.outbox.Add(ctx, events.ContestStream(event.ContestID), event.Type, event)
}

func lightweight(contest *model.Contest) *model.Contest {
	if contest == nil {
		return nil
	}

	copied := *contest
	copied.Squares = nil
	copied.QuarterResults = nil
	copied.Game = nil
	return &copied
}
