package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUserSync_ApplyUserUpdated_CascadesAndBroadcasts(t *testing.T) {
	contestID := uuid.New()
	users := mocks.NewUserRepository(t)
	users.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(u *model.User) bool {
		return u.Email == "a@b.com" && u.DefaultInitials == "XY"
	})).Return(nil)
	squares := mocks.NewSquareRepository(t)
	squares.EXPECT().UpdateInitials(mock.Anything, "a@b.com", "XY").Return([]model.Square{
		{ID: uuid.New(), ContestID: contestID, Value: "XY"},
		{ID: uuid.New(), ContestID: contestID, Value: "XY"},
	}, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, contestID, "a@b.com", mock.Anything).Return(nil).Twice()

	err := service.NewUserSyncService(users, squares, passTx(), pub).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com", DisplayName: "A", DefaultInitials: "XY"})

	require.NoError(t, err)
}

func TestUserSync_ApplyUserUpdated_WithoutInitialsOnlyUpserts(t *testing.T) {
	users := mocks.NewUserRepository(t)
	users.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)

	err := service.NewUserSyncService(users, mocks.NewSquareRepository(t), passTx(), mocks.NewContestEventPublisher(t)).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com"})

	require.NoError(t, err)
}

func TestUserSync_ApplyUserUpdated_Errors(t *testing.T) {
	update := &events.UserUpdated{Email: "a@b.com", DefaultInitials: "XY"}

	users := mocks.NewUserRepository(t)
	users.EXPECT().Upsert(mock.Anything, mock.Anything).Return(errors.New("db"))
	err := service.NewUserSyncService(users, mocks.NewSquareRepository(t), passTx(), anyEvents()).ApplyUserUpdated(context.Background(), update)
	assert.Error(t, err)

	users = mocks.NewUserRepository(t)
	users.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)
	squares := mocks.NewSquareRepository(t)
	squares.EXPECT().UpdateInitials(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	err = service.NewUserSyncService(users, squares, passTx(), anyEvents()).ApplyUserUpdated(context.Background(), update)
	assert.Error(t, err)

	users = mocks.NewUserRepository(t)
	users.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)
	squares = mocks.NewSquareRepository(t)
	squares.EXPECT().UpdateInitials(mock.Anything, mock.Anything, mock.Anything).Return([]model.Square{{}}, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))
	err = service.NewUserSyncService(users, squares, passTx(), pub).ApplyUserUpdated(context.Background(), update)
	assert.Error(t, err)
}

func TestUserSync_ApplyUserDeleted_BroadcastsWhatItFreed(t *testing.T) {
	contestID := uuid.New()
	square := model.Square{ID: uuid.New(), ContestID: contestID}
	member := model.ContestParticipant{ContestID: contestID, UserID: "a@b.com"}
	users := mocks.NewUserRepository(t)
	users.EXPECT().Scrub(mock.Anything, "a@b.com").Return([]model.Square{square}, []model.ContestParticipant{member}, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, contestID, "system", &square).Return(nil).Once()
	pub.EXPECT().PublishParticipantRemoved(mock.Anything, contestID, "system", &member).Return(nil).Once()

	err := service.NewUserSyncService(users, mocks.NewSquareRepository(t), passTx(), pub).
		ApplyUserDeleted(context.Background(), &events.UserDeleted{Email: "a@b.com"})

	require.NoError(t, err)
}

func TestUserSync_ApplyUserDeleted_Errors(t *testing.T) {
	deleted := &events.UserDeleted{Email: "a@b.com"}

	users := mocks.NewUserRepository(t)
	users.EXPECT().Scrub(mock.Anything, "a@b.com").Return(nil, nil, errors.New("db"))
	assert.Error(t, service.NewUserSyncService(users, mocks.NewSquareRepository(t), passTx(), anyEvents()).ApplyUserDeleted(context.Background(), deleted))

	users = mocks.NewUserRepository(t)
	users.EXPECT().Scrub(mock.Anything, "a@b.com").Return([]model.Square{{}}, nil, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))
	assert.Error(t, service.NewUserSyncService(users, mocks.NewSquareRepository(t), passTx(), pub).ApplyUserDeleted(context.Background(), deleted))
}
