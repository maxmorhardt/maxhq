package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/libs/go/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

type ContestEventPublisher interface {
	PublishSquareUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, square *model.Square) error
	PublishContestUpdate(ctx context.Context, contestID uuid.UUID, updatedBy string, contest *model.Contest) error
	PublishQuarterResult(ctx context.Context, contestID uuid.UUID, updatedBy string, quarterResult *model.QuarterResult) error
	PublishContestDeleted(ctx context.Context, contestID uuid.UUID, updatedBy string) error
	PublishPlayerRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, player *model.ContestPlayer) error
	PublishPlayerJoined(ctx context.Context, contestID uuid.UUID, player *model.ContestPlayer) error
	PublishPlayerUpdated(ctx context.Context, contestID uuid.UUID, updatedBy string, player *model.ContestPlayer) error
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

func (p *contestEventPublisher) PublishPlayerRemoved(ctx context.Context, contestID uuid.UUID, updatedBy string, player *model.ContestPlayer) error {
	return p.publish(ctx, events.PlayerRemovedType, contestID, updatedBy, player)
}

func (p *contestEventPublisher) PublishPlayerJoined(ctx context.Context, contestID uuid.UUID, player *model.ContestPlayer) error {
	return p.publish(ctx, events.PlayerJoinedType, contestID, player.UserID, player)
}

func (p *contestEventPublisher) PublishPlayerUpdated(ctx context.Context, contestID uuid.UUID, updatedBy string, player *model.ContestPlayer) error {
	return p.publish(ctx, events.PlayerUpdatedType, contestID, updatedBy, player)
}

func (p *contestEventPublisher) publish(ctx context.Context, eventType string, contestID uuid.UUID, updatedBy string, data any) error {
	event, err := events.NewContestEvent(eventType, contestID, pseudonym.Of(updatedBy), data)
	if err != nil {
		return err
	}
	return p.outbox.Add(ctx, events.ContestStream(contestID), eventType, event)
}
