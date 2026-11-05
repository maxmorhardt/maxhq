package model

import (
	"time"

	"github.com/google/uuid"
)

type ContestBan struct {
	ContestID   uuid.UUID `json:"-" gorm:"type:uuid;primaryKey"`
	UserID      string    `json:"userId" gorm:"primaryKey" example:"u_3q2mL0x9VfTzQk1rB7cW8a"`
	DisplayName string    `json:"displayName" gorm:"->;-:migration" example:"Max Morhardt"`
	CreatedAt   time.Time `json:"bannedAt"`
}
