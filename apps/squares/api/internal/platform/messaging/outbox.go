package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/database"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// an event recorded in the same transaction as the change it describes; the relay publishes it later
type OutboxEvent struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Seq         int64          `gorm:"->"`
	Subject     string         `gorm:"not null"`
	Payload     datatypes.JSON `gorm:"type:jsonb;not null"`
	CreatedAt   time.Time      `gorm:"not null"`
	PublishedAt *time.Time
}

func (OutboxEvent) TableName() string {
	return "outbox"
}

// the only way services emit events, so nothing reaches jetstream unless its transaction committed
type Outbox interface {
	Add(ctx context.Context, subject string, payload any) error
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

func (o *outbox) Add(ctx context.Context, subject string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal outbox payload for %s: %w", subject, err)
	}

	event := &OutboxEvent{
		ID:        uuid.New(),
		Subject:   subject,
		Payload:   data,
		CreatedAt: time.Now(),
	}
	if err := database.Conn(ctx, o.db).Create(event).Error; err != nil {
		return fmt.Errorf("failed to write outbox event for %s: %w", subject, err)
	}

	// wake the relay as soon as the row is visible instead of waiting for its next tick
	database.AfterCommit(ctx, o.notify)
	return nil
}
