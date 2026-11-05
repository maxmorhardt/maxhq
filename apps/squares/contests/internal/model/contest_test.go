package model

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestContest_BeforeCreateGivesEachContestItsOwnInviteToken(t *testing.T) {
	tx := &gorm.DB{Statement: &gorm.Statement{Context: context.Background()}}

	first, second := &Contest{}, &Contest{}
	require.NoError(t, first.BeforeCreate(tx))
	require.NoError(t, second.BeforeCreate(tx))

	assert.NotEqual(t, uuid.Nil, first.ID)
	assert.Len(t, first.InviteToken, 64)
	assert.NotEqual(t, first.InviteToken, second.InviteToken)
}

func TestContest_BeforeCreateKeepsAGivenInviteToken(t *testing.T) {
	tx := &gorm.DB{Statement: &gorm.Statement{Context: context.Background()}}

	contest := &Contest{InviteToken: "given"}
	require.NoError(t, contest.BeforeCreate(tx))
	assert.Equal(t, "given", contest.InviteToken)
}
