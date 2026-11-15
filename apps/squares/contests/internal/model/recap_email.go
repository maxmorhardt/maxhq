package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RecapEmailStatus string

const (
	RecapEmailPending     RecapEmailStatus = "pending"
	RecapEmailSent        RecapEmailStatus = "sent"
	RecapEmailUnconfirmed RecapEmailStatus = "unconfirmed"
	RecapEmailFailed      RecapEmailStatus = "failed"
	RecapEmailSkipped     RecapEmailStatus = "skipped"
)

type RecapEmail struct {
	ID            uuid.UUID        `gorm:"type:uuid;primaryKey"`
	ContestID     uuid.UUID        `gorm:"type:uuid;not null"`
	UserID        string           `gorm:"not null"`
	Status        RecapEmailStatus `gorm:"not null;default:pending"`
	Attempts      int              `gorm:"not null;default:0"`
	LastError     string           `gorm:"not null;default:''"`
	NextAttemptAt time.Time        `gorm:"not null"`
	SentAt        *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (e *RecapEmail) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	if e.NextAttemptAt.IsZero() {
		e.NextAttemptAt = time.Now()
	}
	return nil
}
