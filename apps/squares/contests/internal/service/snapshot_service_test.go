package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestSnapshot_ReturnsContestAndParticipantsToViewers(t *testing.T) {
	contestID := uuid.New()
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, contestID, "v@b.com", service.ActionView).Return(nil)
	pSvc.EXPECT().GetParticipants(mock.Anything, contestID).Return([]model.ContestParticipant{{UserID: "o"}}, nil)
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, contestID).Return(&model.Contest{ID: contestID, Name: "C"}, nil)

	snap, err := service.NewSnapshotService(repo, pSvc).GetSnapshot(context.Background(), contestID, "v@b.com")

	require.NoError(t, err)
	assert.Equal(t, "C", snap.Contest.Name)
	assert.Len(t, snap.Participants, 1)
}

func TestSnapshot_AuthorizationOutcomes(t *testing.T) {
	tests := []struct {
		name    string
		authErr error
		want    error
	}{
		{"missing contest", errs.ErrContestNotFound, errs.ErrContestNotFound},
		{"not a participant", errs.ErrNotParticipant, errs.ErrInsufficientRole},
		{"database down", errs.ErrDatabaseUnavailable, errs.ErrDatabaseUnavailable},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pSvc := mocks.NewParticipantService(t)
			pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, service.ActionView).Return(tt.authErr)

			_, err := service.NewSnapshotService(mocks.NewContestRepository(t), pSvc).GetSnapshot(context.Background(), uuid.New(), "v@b.com")

			assert.ErrorIs(t, err, tt.want)
		})
	}
}

func TestSnapshot_LoadErrors(t *testing.T) {
	contestID := uuid.New()

	pSvc := okAuth(t)
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, contestID).Return(nil, database.ErrNotFound)
	_, err := service.NewSnapshotService(repo, pSvc).GetSnapshot(context.Background(), contestID, "v")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)

	repo = mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, contestID).Return(nil, errors.New("db"))
	_, err = service.NewSnapshotService(repo, okAuth(t)).GetSnapshot(context.Background(), contestID, "v")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	repo = mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, contestID).Return(&model.Contest{ID: contestID}, nil)
	pSvc = okAuth(t)
	pSvc.EXPECT().GetParticipants(mock.Anything, contestID).Return(nil, errs.ErrDatabaseUnavailable)
	_, err = service.NewSnapshotService(repo, pSvc).GetSnapshot(context.Background(), contestID, "v")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}
