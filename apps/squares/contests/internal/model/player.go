package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PlayerRole string

const (
	PlayerRoleOwner  PlayerRole = "owner"
	PlayerRolePlayer PlayerRole = "player"
)

type ContestPlayer struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	ContestID uuid.UUID `json:"contestId" gorm:"type:uuid;index;not null"`
	UserID    string    `json:"userId" gorm:"not null;index"`
	// read from contests.users, so other players can be shown a name instead of an email
	DisplayName string     `json:"displayName,omitempty" gorm:"->;-:migration"`
	Role        PlayerRole `json:"role" gorm:"not null"`
	MaxSquares  int        `json:"maxSquares" gorm:"not null;default:0"`
	JoinedAt    time.Time  `json:"joinedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func (p *ContestPlayer) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.JoinedAt.IsZero() {
		p.JoinedAt = time.Now()
	}
	return
}
