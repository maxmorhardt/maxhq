package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/maxmorhardt/maxstash/libs/squares/internalapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUserActivity_GetStats(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	want := &model.UserStatsResponse{QuarterWins: 3}
	repo.EXPECT().GetStats(mock.Anything, "a@b.com").Return(want, nil)

	got, err := service.NewUserActivityService(repo, passTx(), anyEvents()).GetStats(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestUserActivity_GetStats_Error(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetStats(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	_, err := service.NewUserActivityService(repo, passTx(), anyEvents()).GetStats(context.Background(), "a@b.com")

	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUserActivity_GetActiveContests(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, "a@b.com").Return([]internalapi.UserActiveContest{{Name: "C"}}, nil)

	got, err := service.NewUserActivityService(repo, passTx(), anyEvents()).GetActiveContests(context.Background(), "a@b.com")
	require.NoError(t, err)
	assert.Len(t, got, 1)

	repo = mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err = service.NewUserActivityService(repo, passTx(), anyEvents()).GetActiveContests(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUserActivity_GetActivitySummary(t *testing.T) {
	first := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, "a@b.com").Return(nil, nil)
	repo.EXPECT().FirstActivity(mock.Anything, "a@b.com").Return(&first, nil)

	summary, err := service.NewUserActivityService(repo, passTx(), anyEvents()).GetActivitySummary(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.NotNil(t, summary.ActiveContests, "an empty list encodes as [] for the accounts client")
	assert.Equal(t, &first, summary.FirstActivity)
}

func TestUserActivity_GetActivitySummary_Errors(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err := service.NewUserActivityService(repo, passTx(), anyEvents()).GetActivitySummary(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	repo = mocks.NewUserProjectionRepository(t)
	repo.EXPECT().GetActiveContests(mock.Anything, mock.Anything).Return(nil, nil)
	repo.EXPECT().FirstActivity(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err = service.NewUserActivityService(repo, passTx(), anyEvents()).GetActivitySummary(context.Background(), "a@b.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUserActivity_ApplyUserUpdated_CascadesAndBroadcasts(t *testing.T) {
	contestID := uuid.New()
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().Upsert(mock.Anything, mock.MatchedBy(func(u *model.User) bool {
		return u.Email == "a@b.com" && u.DefaultInitials == "XY"
	})).Return(nil)
	repo.EXPECT().CascadeInitials(mock.Anything, "a@b.com", "XY").Return([]model.Square{
		{ID: uuid.New(), ContestID: contestID, Value: "XY"},
		{ID: uuid.New(), ContestID: contestID, Value: "XY"},
	}, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, contestID, "a@b.com", mock.Anything).Return(nil).Twice()

	err := service.NewUserActivityService(repo, passTx(), pub).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com", DisplayName: "A", DefaultInitials: "XY"})

	require.NoError(t, err)
}

func TestUserActivity_ApplyUserUpdated_WithoutInitialsOnlyUpserts(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)

	err := service.NewUserActivityService(repo, passTx(), mocks.NewContestEventPublisher(t)).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com"})

	require.NoError(t, err)
}

func TestUserActivity_ApplyUserUpdated_Errors(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().Upsert(mock.Anything, mock.Anything).Return(errors.New("db"))
	err := service.NewUserActivityService(repo, passTx(), anyEvents()).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com", DefaultInitials: "XY"})
	assert.Error(t, err)

	repo = mocks.NewUserProjectionRepository(t)
	repo.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)
	repo.EXPECT().CascadeInitials(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	err = service.NewUserActivityService(repo, passTx(), anyEvents()).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com", DefaultInitials: "XY"})
	assert.Error(t, err)

	repo = mocks.NewUserProjectionRepository(t)
	repo.EXPECT().Upsert(mock.Anything, mock.Anything).Return(nil)
	repo.EXPECT().CascadeInitials(mock.Anything, mock.Anything, mock.Anything).Return([]model.Square{{}}, nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))
	err = service.NewUserActivityService(repo, passTx(), pub).
		ApplyUserUpdated(context.Background(), &events.UserUpdated{Email: "a@b.com", DefaultInitials: "XY"})
	assert.Error(t, err)
}

func TestUserActivity_ApplyUserDeleted(t *testing.T) {
	repo := mocks.NewUserProjectionRepository(t)
	repo.EXPECT().ScrubUserData(mock.Anything, "a@b.com").Return(nil).Once()
	require.NoError(t, service.NewUserActivityService(repo, passTx(), anyEvents()).
		ApplyUserDeleted(context.Background(), &events.UserDeleted{Email: "a@b.com"}))

	repo = mocks.NewUserProjectionRepository(t)
	repo.EXPECT().ScrubUserData(mock.Anything, "a@b.com").Return(errors.New("db"))
	assert.Error(t, service.NewUserActivityService(repo, passTx(), anyEvents()).
		ApplyUserDeleted(context.Background(), &events.UserDeleted{Email: "a@b.com"}))
}
