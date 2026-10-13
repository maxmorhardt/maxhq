package streams

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// an event recorded in the same transaction as the change it describes; the relay appends it to Stream later
type OutboxEvent struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Seq         int64          `gorm:"->"`
	Stream      string         `gorm:"not null"`
	Type        string         `gorm:"not null"`
	Payload     datatypes.JSON `gorm:"type:jsonb;not null"`
	CreatedAt   time.Time      `gorm:"not null"`
	PublishedAt *time.Time
}

func (OutboxEvent) TableName() string {
	return "outbox"
}

// the only way services emit events, so nothing reaches a stream unless its transaction committed
type Outbox interface {
	Add(ctx context.Context, stream, eventType string, payload any) error
}

type outbox struct {
	db     *gorm.DB
	notify func()
}

func NewOutbox(db *gorm.DB, notify func()) Outbox {
	if notify == nil {
		notify = func() {}
	}

	return &outbox{db: db, notify: notify}
}

func (o *outbox) Add(ctx context.Context, stream, eventType string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal outbox payload for %s: %w", eventType, err)
	}

	event := &OutboxEvent{
		ID:        uuid.New(),
		Stream:    stream,
		Type:      eventType,
		Payload:   data,
		CreatedAt: time.Now(),
	}
	if err := database.Conn(ctx, o.db).Create(event).Error; err != nil {
		return fmt.Errorf("failed to write outbox event for %s: %w", eventType, err)
	}

	// wake the relay as soon as the row is visible instead of waiting for its next tick
	database.AfterCommit(ctx, o.notify)
	return nil
}
