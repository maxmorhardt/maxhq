package streams

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

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

	database.AfterCommit(ctx, o.notify)
	return nil
}
