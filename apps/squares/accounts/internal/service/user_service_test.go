package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/mocks"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/accounts/internal/service"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
	"github.com/maxmorhardt/maxstash/libs/squares/events"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// runs the unit of work inline, standing in for a real transaction
func passTx() *mocks.Transactor {
	m := &mocks.Transactor{}
	m.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }).Maybe()
	return m
}

type userDeps struct {
	repo        *mocks.UserRepository
	outbox      *mocks.Outbox
	contests    *mocks.ContestActivityClient
	revocations *mocks.RevocationStore
}

func newUserDeps(t *testing.T) userDeps {
	return userDeps{
		repo:        mocks.NewUserRepository(t),
		outbox:      mocks.NewOutbox(t),
		contests:    mocks.NewContestActivityClient(t),
		revocations: mocks.NewRevocationStore(t),
	}
}

func (d userDeps) svc() service.UserService {
	return service.NewUserService(d.repo, passTx(), d.outbox, d.contests, d.revocations)
}

func TestGetProfile_Existing(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().GetByEmail(mock.Anything, "a@b.com").Return(&model.User{Email: "a@b.com", DefaultInitials: "MM"}, nil)

	user, err := d.svc().GetProfile(context.Background(), "a@b.com", "Max Morhardt")

	require.NoError(t, err)
	assert.Equal(t, "MM", user.DefaultInitials)
}

func TestGetProfile_CreatesWithFirstActivityAndAnnouncesIt(t *testing.T) {
	first := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	d := newUserDeps(t)
	d.repo.EXPECT().GetByEmail(mock.Anything, "a@b.com").Return(nil, gorm.ErrRecordNotFound)
	d.contests.EXPECT().GetUserActivity(mock.Anything, "a@b.com").Return(&contracts.UserActivitySummary{FirstActivity: &first}, nil)
	d.repo.EXPECT().CreateIfMissing(mock.Anything, mock.MatchedBy(func(u *model.User) bool {
		return u.DefaultInitials == "MM" && u.CreatedAt.Equal(first)
	})).RunAndReturn(func(_ context.Context, u *model.User) (*model.User, error) { return u, nil })
	d.outbox.EXPECT().Add(mock.Anything, events.UsersStream, events.UserUpdatedType, events.UserUpdated{Email: "a@b.com", DisplayName: "Max Morhardt", DefaultInitials: "MM"}).Return(nil)

	user, err := d.svc().GetProfile(context.Background(), "a@b.com", "Max Morhardt")

	require.NoError(t, err)
	assert.Equal(t, "Max Morhardt", user.DisplayName)
}

func TestGetProfile_CreatesEvenWhenContestsIsDown(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().GetByEmail(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).Return(nil, errors.New("down"))
	d.repo.EXPECT().CreateIfMissing(mock.Anything, mock.MatchedBy(func(u *model.User) bool { return u.CreatedAt.IsZero() })).
		RunAndReturn(func(_ context.Context, u *model.User) (*model.User, error) { return u, nil })
	d.outbox.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := d.svc().GetProfile(context.Background(), "a@b.com", "Max")

	require.NoError(t, err)
}

func TestGetProfile_Errors(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().GetByEmail(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err := d.svc().GetProfile(context.Background(), "a@b.com", "Max")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)

	d = newUserDeps(t)
	d.repo.EXPECT().GetByEmail(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).Return(&contracts.UserActivitySummary{}, nil)
	d.repo.EXPECT().CreateIfMissing(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	_, err = d.svc().GetProfile(context.Background(), "a@b.com", "Max")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateProfile_PublishesTheChange(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().UpdateInitials(mock.Anything, "a@b.com", "XY").Return(&model.User{Email: "a@b.com", DefaultInitials: "XY"}, nil)
	d.outbox.EXPECT().Add(mock.Anything, events.UsersStream, events.UserUpdatedType, events.UserUpdated{Email: "a@b.com", DefaultInitials: "XY"}).Return(nil)

	user, err := d.svc().UpdateProfile(context.Background(), "a@b.com", "XY")

	require.NoError(t, err)
	assert.Equal(t, "XY", user.DefaultInitials)
}

func TestUpdateProfile_Errors(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().UpdateInitials(mock.Anything, mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)
	_, err := d.svc().UpdateProfile(context.Background(), "a@b.com", "XY")
	assert.ErrorIs(t, err, errs.ErrUserNotFound)

	d = newUserDeps(t)
	d.repo.EXPECT().UpdateInitials(mock.Anything, mock.Anything, mock.Anything).Return(&model.User{}, nil)
	d.outbox.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))
	_, err = d.svc().UpdateProfile(context.Background(), "a@b.com", "XY")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestDeleteAccount_TombstonesAnnouncesAndRevokes(t *testing.T) {
	d := newUserDeps(t)
	d.contests.EXPECT().GetUserActivity(mock.Anything, "a@b.com").Return(&contracts.UserActivitySummary{}, nil)
	d.repo.EXPECT().DeleteWithTombstone(mock.Anything, "a@b.com", mock.Anything).Return(nil)
	d.outbox.EXPECT().Add(mock.Anything, events.UsersStream, events.UserDeletedType, mock.MatchedBy(func(e events.UserDeleted) bool { return e.Email == "a@b.com" })).Return(nil)
	d.revocations.EXPECT().Revoke(mock.Anything, "a@b.com", mock.Anything).Return(nil)

	require.NoError(t, d.svc().DeleteAccount(context.Background(), "a@b.com"))
}

func TestDeleteAccount_BlockedByActiveContests(t *testing.T) {
	d := newUserDeps(t)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).
		Return(&contracts.UserActivitySummary{ActiveContests: []contracts.UserActiveContest{{Name: "C"}}}, nil)

	assert.ErrorIs(t, d.svc().DeleteAccount(context.Background(), "a@b.com"), errs.ErrAccountActiveContests)
}

func TestDeleteAccount_RefusesWhenContestsCannotBeAsked(t *testing.T) {
	d := newUserDeps(t)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).Return(nil, errors.New("down"))

	assert.ErrorIs(t, d.svc().DeleteAccount(context.Background(), "a@b.com"), errs.ErrDependencyFailed)
}

func TestDeleteAccount_DatabaseFailure(t *testing.T) {
	d := newUserDeps(t)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).Return(&contracts.UserActivitySummary{}, nil)
	d.repo.EXPECT().DeleteWithTombstone(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))

	assert.ErrorIs(t, d.svc().DeleteAccount(context.Background(), "a@b.com"), errs.ErrDatabaseUnavailable)
}

func TestDeleteAccount_RedisFailureStillSucceeds(t *testing.T) {
	d := newUserDeps(t)
	d.contests.EXPECT().GetUserActivity(mock.Anything, mock.Anything).Return(&contracts.UserActivitySummary{}, nil)
	d.repo.EXPECT().DeleteWithTombstone(mock.Anything, mock.Anything, mock.Anything).Return(nil)
	d.outbox.EXPECT().Add(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	d.revocations.EXPECT().Revoke(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("redis down"))

	assert.NoError(t, d.svc().DeleteAccount(context.Background(), "a@b.com"), "the durable tombstone is restored to redis on the next start")
}

func TestSyncRevocations(t *testing.T) {
	deletedAt := time.Now().Add(-time.Hour)
	d := newUserDeps(t)
	d.repo.EXPECT().TombstonesSince(mock.Anything, mock.Anything).Return([]repository.Tombstone{{Email: "a@b.com", DeletedAt: deletedAt}}, nil)
	d.revocations.EXPECT().Revoke(mock.Anything, "a@b.com", deletedAt).Return(nil).Once()

	require.NoError(t, d.svc().SyncRevocations(context.Background()))
}

func TestSyncRevocations_Errors(t *testing.T) {
	d := newUserDeps(t)
	d.repo.EXPECT().TombstonesSince(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	assert.Error(t, d.svc().SyncRevocations(context.Background()))

	d = newUserDeps(t)
	d.repo.EXPECT().TombstonesSince(mock.Anything, mock.Anything).Return([]repository.Tombstone{{Email: "a@b.com"}}, nil)
	d.revocations.EXPECT().Revoke(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("redis"))
	assert.Error(t, d.svc().SyncRevocations(context.Background()))
}
