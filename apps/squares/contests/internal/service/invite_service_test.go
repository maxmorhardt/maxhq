package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

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

type inviteDeps struct {
	contests *mocks.ContestRepository
	players  *mocks.PlayerRepository
	bans     *mocks.BanRepository
	users    *mocks.UserRepository
	authz    *mocks.PlayerService
	events   *mocks.ContestEventPublisher
}

func newInviteDeps(t *testing.T) *inviteDeps {
	return &inviteDeps{
		contests: mocks.NewContestRepository(t),
		players:  mocks.NewPlayerRepository(t),
		bans:     mocks.NewBanRepository(t),
		users:    anyUser(),
		authz:    mocks.NewPlayerService(t),
		events:   anyEvents(),
	}
}

func (d *inviteDeps) svc() service.InviteService {
	return service.NewInviteService(d.contests, d.players, d.bans, d.users, d.authz, passTx(), d.events)
}

func (d *inviteDeps) owner() {
	d.authz.EXPECT().Authorize(mock.Anything, mock.Anything, "owner", service.ActionManagePlayers).Return(nil)
}

func TestGetInviteLink_Success(t *testing.T) {
	d := newInviteDeps(t)
	d.owner()
	contestID := uuid.New()
	d.contests.EXPECT().GetInviteToken(mock.Anything, contestID).Return("tok", nil)

	got, err := d.svc().GetInviteLink(context.Background(), contestID, "owner")
	require.NoError(t, err)
	assert.Equal(t, "tok", got.Token)
}

func TestGetInviteLink_Failures(t *testing.T) {
	d := newInviteDeps(t)
	d.authz.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)
	_, err := d.svc().GetInviteLink(context.Background(), uuid.New(), "player")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)

	for repoErr, want := range map[error]error{database.ErrNotFound: errs.ErrContestNotFound, errors.New("db"): errs.ErrDatabaseUnavailable} {
		d := newInviteDeps(t)
		d.owner()
		d.contests.EXPECT().GetInviteToken(mock.Anything, mock.Anything).Return("", repoErr)
		_, err := d.svc().GetInviteLink(context.Background(), uuid.New(), "owner")
		assert.ErrorIs(t, err, want)
	}
}

func TestResetInviteLink_Success(t *testing.T) {
	d := newInviteDeps(t)
	d.owner()
	contestID := uuid.New()
	d.contests.EXPECT().ResetInviteToken(mock.Anything, contestID).Return("fresh", nil)

	got, err := d.svc().ResetInviteLink(context.Background(), contestID, "owner")
	require.NoError(t, err)
	assert.Equal(t, "fresh", got.Token)
}

func TestResetInviteLink_Failures(t *testing.T) {
	cases := map[string]struct {
		setup func(d *inviteDeps)
		want  error
	}{
		"unauthorized": {func(d *inviteDeps) {
			d.authz.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)
		}, errs.ErrInsufficientRole},
		"finished or deleted": {func(d *inviteDeps) {
			d.owner()
			d.contests.EXPECT().ResetInviteToken(mock.Anything, mock.Anything).Return("", database.ErrNotFound)
		}, errs.ErrContestFinalized},
		"reset": {func(d *inviteDeps) {
			d.owner()
			d.contests.EXPECT().ResetInviteToken(mock.Anything, mock.Anything).Return("", errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
	}
	for name, tc := range cases {
		d := newInviteDeps(t)
		tc.setup(d)
		_, err := d.svc().ResetInviteLink(context.Background(), uuid.New(), "owner")
		assert.ErrorIs(t, err, tc.want, name)
	}
}

func TestGetInvitePreview_Success(t *testing.T) {
	d := newInviteDeps(t)
	contestID := uuid.New()
	kickoff := time.Date(2026, 10, 25, 17, 0, 0, 0, time.UTC)
	d.contests.EXPECT().GetByInviteToken(mock.Anything, "tok").Return(&model.Contest{
		ID: contestID, Name: "Pool", Owner: "owner", Status: model.ContestStatusActive,
		HomeTeam: "Lions", AwayTeam: "Bears",
		Squares: []model.Square{{Owner: "a"}, {Owner: "b"}, {}},
		Game:    &model.Game{HomeAbbr: "DET", AwayAbbr: "CHI", GameTime: kickoff},
	}, nil)
	d.players.EXPECT().GetByContestAndUser(mock.Anything, contestID, "owner").Return(&model.ContestPlayer{UserID: "owner", DisplayName: "Olive Owens"}, nil)

	got, err := d.svc().GetInvitePreview(context.Background(), "tok")
	require.NoError(t, err)
	assert.Equal(t, contestID, got.ContestID)
	assert.Equal(t, "Pool", got.ContestName)
	assert.Equal(t, "Olive Owens", got.OwnerName)
	assert.Equal(t, model.ContestStatusActive, got.Status)
	assert.Equal(t, 2, got.ClaimedSquares)
	assert.Equal(t, 3, got.TotalSquares)
	assert.Equal(t, "Bears", got.AwayTeam)
	assert.Equal(t, "DET", got.HomeAbbr)
	assert.Equal(t, &kickoff, got.GameTime)
}

func TestGetInvitePreview_OwnerMissingLeavesTheNameOut(t *testing.T) {
	d := newInviteDeps(t)
	d.contests.EXPECT().GetByInviteToken(mock.Anything, mock.Anything).Return(&model.Contest{Owner: "owner"}, nil)
	d.players.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner").Return(nil, database.ErrNotFound)

	got, err := d.svc().GetInvitePreview(context.Background(), "tok")
	require.NoError(t, err)
	assert.Empty(t, got.OwnerName)
	assert.Nil(t, got.GameTime)
}

func TestGetInvitePreview_Failures(t *testing.T) {
	cases := map[string]struct {
		setup func(d *inviteDeps)
		want  error
	}{
		"unknown token": {func(d *inviteDeps) {
			d.contests.EXPECT().GetByInviteToken(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)
		}, errs.ErrInviteNotFound},
		"token lookup": {func(d *inviteDeps) {
			d.contests.EXPECT().GetByInviteToken(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"owner lookup": {func(d *inviteDeps) {
			d.contests.EXPECT().GetByInviteToken(mock.Anything, mock.Anything).Return(&model.Contest{Owner: "owner"}, nil)
			d.players.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
	}
	for name, tc := range cases {
		d := newInviteDeps(t)
		tc.setup(d)
		_, err := d.svc().GetInvitePreview(context.Background(), "tok")
		assert.ErrorIs(t, err, tc.want, name)
	}
}

func TestJoin_JoinsWithNoSquares(t *testing.T) {
	d := newInviteDeps(t)
	contestID := uuid.New()
	d.contests.EXPECT().GetIDByInviteToken(mock.Anything, "tok").Return(contestID, nil)
	d.contests.EXPECT().LockStatus(mock.Anything, contestID).Return(model.ContestStatusActive, nil)
	d.bans.EXPECT().Exists(mock.Anything, contestID, "pat@x.com").Return(false, nil)
	d.players.EXPECT().Create(mock.Anything, mock.MatchedBy(func(p *model.ContestPlayer) bool {
		return p.ContestID == contestID && p.UserID == "pat@x.com" && p.Role == model.PlayerRolePlayer && p.MaxSquares == 0
	})).Return(nil)
	d.events = mocks.NewContestEventPublisher(t)
	d.events.EXPECT().PublishPlayerJoined(mock.Anything, contestID, mock.Anything).Return(nil).Once()

	got, err := d.svc().Join(context.Background(), "tok", "pat@x.com", "Pat Player")
	require.NoError(t, err)
	assert.Equal(t, "Pat Player", got.DisplayName)
	assert.Equal(t, 0, got.MaxSquares)
}

func TestJoin_ChecksTheBanUnderTheContestLock(t *testing.T) {
	d := newInviteDeps(t)
	tx := &mocks.Transactor{}
	tx.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error {
			return fn(context.WithValue(ctx, inTxKey{}, true))
		})
	inTx := mock.MatchedBy(func(ctx context.Context) bool { return ctx.Value(inTxKey{}) != nil })
	d.contests.EXPECT().GetIDByInviteToken(mock.Anything, mock.Anything).Return(uuid.New(), nil)
	d.contests.EXPECT().LockStatus(inTx, mock.Anything).Return(model.ContestStatusActive, nil).Once()
	d.bans.EXPECT().Exists(inTx, mock.Anything, mock.Anything).Return(true, nil).Once()

	svc := service.NewInviteService(d.contests, d.players, d.bans, d.users, d.authz, tx, d.events)
	_, err := svc.Join(context.Background(), "tok", "pat@x.com", "Pat")
	assert.ErrorIs(t, err, errs.ErrBannedFromContest)
}

func TestJoin_AfterKickoffJoinsToWatch(t *testing.T) {
	d := newInviteDeps(t)
	d.contests.EXPECT().GetIDByInviteToken(mock.Anything, mock.Anything).Return(uuid.New(), nil)
	d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatusQ3, nil)
	d.bans.EXPECT().Exists(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	d.players.EXPECT().Create(mock.Anything, mock.Anything).Return(nil)

	_, err := d.svc().Join(context.Background(), "tok", "pat@x.com", "Pat")
	require.NoError(t, err)
}

func TestJoin_Failures(t *testing.T) {
	found := func(d *inviteDeps) {
		d.contests.EXPECT().GetIDByInviteToken(mock.Anything, mock.Anything).Return(uuid.New(), nil)
	}
	joinable := func(d *inviteDeps) {
		found(d)
		d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatusActive, nil)
		d.bans.EXPECT().Exists(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	}
	cases := map[string]struct {
		setup func(d *inviteDeps)
		want  error
	}{
		"unknown token": {func(d *inviteDeps) {
			d.contests.EXPECT().GetIDByInviteToken(mock.Anything, mock.Anything).Return(uuid.Nil, database.ErrNotFound)
		}, errs.ErrInviteNotFound},
		"token lookup": {func(d *inviteDeps) {
			d.contests.EXPECT().GetIDByInviteToken(mock.Anything, mock.Anything).Return(uuid.Nil, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"deleted meanwhile": {func(d *inviteDeps) {
			found(d)
			d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatus(""), database.ErrNotFound)
		}, errs.ErrInviteNotFound},
		"lock": {func(d *inviteDeps) {
			found(d)
			d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatus(""), errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"finished": {func(d *inviteDeps) {
			found(d)
			d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatusFinished, nil)
		}, errs.ErrContestFinalized},
		"banned": {func(d *inviteDeps) {
			found(d)
			d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatusActive, nil)
			d.bans.EXPECT().Exists(mock.Anything, mock.Anything, mock.Anything).Return(true, nil)
		}, errs.ErrBannedFromContest},
		"ban lookup": {func(d *inviteDeps) {
			found(d)
			d.contests.EXPECT().LockStatus(mock.Anything, mock.Anything).Return(model.ContestStatusActive, nil)
			d.bans.EXPECT().Exists(mock.Anything, mock.Anything, mock.Anything).Return(false, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"already in": {func(d *inviteDeps) {
			joinable(d)
			d.players.EXPECT().Create(mock.Anything, mock.Anything).Return(database.ErrDuplicate)
		}, errs.ErrAlreadyPlayer},
		"create": {func(d *inviteDeps) {
			joinable(d)
			d.players.EXPECT().Create(mock.Anything, mock.Anything).Return(assert.AnError)
		}, assert.AnError},
		"profile": {func(d *inviteDeps) {
			joinable(d)
			d.players.EXPECT().Create(mock.Anything, mock.Anything).Return(nil)
			d.users = mocks.NewUserRepository(t)
			d.users.EXPECT().GetOrCreate(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, assert.AnError)
		}, assert.AnError},
		"event": {func(d *inviteDeps) {
			joinable(d)
			d.players.EXPECT().Create(mock.Anything, mock.Anything).Return(nil)
			d.events = mocks.NewContestEventPublisher(t)
			d.events.EXPECT().PublishPlayerJoined(mock.Anything, mock.Anything, mock.Anything).Return(assert.AnError)
		}, assert.AnError},
	}
	for name, tc := range cases {
		d := newInviteDeps(t)
		tc.setup(d)
		_, err := d.svc().Join(context.Background(), "tok", "pat@x.com", "Pat")
		assert.ErrorIs(t, err, tc.want, name)
	}
}
