package model

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const (
	MaxContestSquares         = 100
	MaxOpenContestsPerOwner   = 25
	MaxContestsPerOwnerPerDay = 50

	CreationWindow = 24 * time.Hour
)

// how many of something are still usable, and how many were made within the creation window
type CreationCounts struct {
	Open   int
	Recent int
}

type ContestVisibility string

const (
	ContestVisibilityPrivate ContestVisibility = "private"
	ContestVisibilityPublic  ContestVisibility = "public"
)

type Contest struct {
	ID             uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	Name           string            `json:"name"`
	XLabels        datatypes.JSON    `json:"xLabels"`
	YLabels        datatypes.JSON    `json:"yLabels"`
	HomeTeam       string            `json:"homeTeam,omitempty"`
	AwayTeam       string            `json:"awayTeam,omitempty"`
	Squares        []Square          `json:"squares" gorm:"foreignKey:ContestID;constraint:OnDelete:CASCADE"`
	QuarterResults []QuarterResult   `json:"quarterResults,omitempty" gorm:"foreignKey:ContestID;constraint:OnDelete:CASCADE"`
	Owner          string            `json:"owner"`
	Visibility     ContestVisibility `json:"visibility" gorm:"not null;default:private"`
	Status         ContestStatus     `json:"status" gorm:"not null;default:ACTIVE"`
	Version        int64             `json:"version" gorm:"not null;default:1"`
	GameID         *uuid.UUID        `json:"gameId,omitempty" gorm:"type:uuid;index"`
	InviteToken    string            `json:"-" gorm:"uniqueIndex;not null"`
	// scoring reads contests' copy of the game; clients get the game itself from the games API
	Game      *Game     `json:"-" gorm:"foreignKey:GameID;constraint:OnDelete:SET NULL"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	CreatedBy string    `json:"-"`
	UpdatedBy string    `json:"-"`
}

func (c *Contest) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.InviteToken == "" {
		if c.InviteToken, err = NewInviteToken(); err != nil {
			return err
		}
	}

	if user, ok := tx.Statement.Context.Value(api.UserKey).(string); ok {
		c.CreatedBy = user
		c.UpdatedBy = user
	}

	return
}

func (c *Contest) BeforeUpdate(tx *gorm.DB) (err error) {
	if user, ok := tx.Statement.Context.Value(api.UserKey).(string); ok {
		c.UpdatedBy = user
	}

	return
}

func NewInviteToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
