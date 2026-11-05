package service_test

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	if err := pseudonym.SetKey("0123456789abcdef0123456789abcdef"); err != nil {
		panic(err)
	}
	os.Exit(m.Run())
}

// lets the service find the email behind any user id these tests use
func withParticipants(p *mocks.ParticipantRepository) {
	participants := make([]model.ContestParticipant, 0, 5)
	for _, email := range []string{"owner@x.com", "target@x.com", "caller@x.com", "self@x.com", "owner-target@x.com"} {
		participants = append(participants, model.ContestParticipant{UserID: email})
	}
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(participants, nil).Maybe()
}

func TestAuthorize_PublicViewSkipsParticipantLookup(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPublic, nil)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.NoError(t, svc.Authorize(context.Background(), uuid.New(), "anyone", service.ActionView))
}

func TestAuthorize_VisibilityNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibility(""), database.ErrNotFound)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrContestNotFound)
}

func TestAuthorize_VisibilityDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibility(""), errors.New("boom"))

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrDatabaseUnavailable)
}

func TestAuthorize_NotParticipant(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPrivate, nil)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrNotParticipant)
}

func TestAuthorize_ParticipantDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPrivate, nil)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("boom"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrDatabaseUnavailable)
}

func TestAuthorize_InsufficientRole(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionManageParticipants), errs.ErrInsufficientRole)
}

func TestAuthorize_OwnerCanDelete(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.NoError(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionDeleteContest))
}

func TestGetParticipants_Success(t *testing.T) {
	want := []model.ContestParticipant{{UserID: "u"}}
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(want, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	got, err := svc.GetParticipants(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestGetParticipants_Error(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.GetParticipants(context.Background(), uuid.New())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func bansRemovingTarget(t *testing.T) *mocks.BanRepository {
	b := mocks.NewBanRepository(t)
	b.EXPECT().Create(mock.Anything, mock.MatchedBy(func(ban *model.ContestBan) bool { return ban.UserID == "target@x.com" })).Return(nil).Once()
	return b
}

func asOwner(p *mocks.ParticipantRepository) {
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{UserID: "owner@x.com", Role: model.ParticipantRoleOwner}, nil)
}

func activeContest(c *mocks.ContestRepository) {
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
}

func TestUpdateParticipant_ContestNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)
	p := mocks.NewParticipantRepository(t)
	asOwner(p)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestUpdateParticipant_ContestDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	p := mocks.NewParticipantRepository(t)
	asOwner(p)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_TerminalContest(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)
	p := mocks.NewParticipantRepository(t)
	asOwner(p)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestFinalized)
}

func TestUpdateParticipant_AfterKickoff(t *testing.T) {
	for _, status := range []model.ContestStatus{model.ContestStatusQ1, model.ContestStatusQ4} {
		c := mocks.NewContestRepository(t)
		c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: status}, nil)
		p := mocks.NewParticipantRepository(t)
		asOwner(p)

		svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
		_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 20, "owner@x.com")
		assert.ErrorIs(t, err, errs.ErrParticipantsLocked, status)
	}
}

func TestUpdateParticipant_UnauthorizedCallerNeverLocksTheContest(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestUpdateParticipant_UnknownPseudonym(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("stranger@x.com"), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestUpdateParticipant_TargetLookupErrors(t *testing.T) {
	cases := map[error]error{
		database.ErrNotFound: errs.ErrNotParticipant,
		errors.New("db"):     errs.ErrDatabaseUnavailable,
	}
	for repoErr, want := range cases {
		c := mocks.NewContestRepository(t)
		activeContest(c)
		p := mocks.NewParticipantRepository(t)
		withParticipants(p)
		asOwner(p)
		p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, repoErr)

		svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
		_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
		assert.ErrorIs(t, err, want)
	}
}

func TestUpdateParticipant_SameLimitChangesNothing(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{UserID: "target@x.com", Role: model.ParticipantRoleParticipant, MaxSquares: 5}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), mocks.NewContestEventPublisher(t))
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 5, got.MaxSquares)
}

func TestUpdateParticipant_RaiseWithinThePool(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{UserID: "target@x.com", Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(95, nil)
	p.EXPECT().Update(mock.Anything, mock.MatchedBy(func(cp *model.ContestParticipant) bool { return cp.MaxSquares == 15 })).Return(nil)
	contestID := uuid.New()
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishParticipantUpdated(mock.Anything, contestID, "owner@x.com", mock.Anything).Return(nil).Once()

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), pub)
	got, err := svc.UpdateParticipant(context.Background(), contestID, pseudonym.Of("target@x.com"), 15, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 15, got.MaxSquares, "95 allotted, 5 more reaches exactly 100")
}

func TestUpdateParticipant_RaisePastThePool(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(96, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), mocks.NewContestEventPublisher(t))
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 15, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotEnoughSquares)
}

func TestUpdateParticipant_PoolDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(0, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_LowerAboveWhatTheyHoldFreesNothing(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(3, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 5, got.MaxSquares)
}

func TestUpdateParticipant_LowerBelowWhatTheyHoldFreesTheRestAtRandom(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{UserID: "target@x.com", Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(8, nil)
	sq.EXPECT().ClearRandomByOwner(mock.Anything, mock.Anything, "target@x.com", 3).Return([]model.Square{{}, {}, {}}, nil).Once()
	p.EXPECT().Update(mock.Anything, mock.MatchedBy(func(cp *model.ContestParticipant) bool { return cp.MaxSquares == 5 })).Return(nil)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, "target@x.com", mock.Anything).Return(nil).Times(3)
	pub.EXPECT().PublishParticipantUpdated(mock.Anything, mock.Anything, "owner@x.com", mock.Anything).Return(nil).Once()

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), pub)
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 5, got.MaxSquares)
}

func TestUpdateParticipant_FreeingFailures(t *testing.T) {
	cases := map[string]func(sq *mocks.SquareRepository, pub *mocks.ContestEventPublisher){
		"count": func(sq *mocks.SquareRepository, _ *mocks.ContestEventPublisher) {
			sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(0, errors.New("db"))
		},
		"clear": func(sq *mocks.SquareRepository, _ *mocks.ContestEventPublisher) {
			sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(8, nil)
			sq.EXPECT().ClearRandomByOwner(mock.Anything, mock.Anything, "target@x.com", 8).Return(nil, errors.New("db"))
		},
		"event": func(sq *mocks.SquareRepository, pub *mocks.ContestEventPublisher) {
			sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(8, nil)
			sq.EXPECT().ClearRandomByOwner(mock.Anything, mock.Anything, "target@x.com", 8).Return([]model.Square{{}}, nil)
			pub.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))
		},
	}
	for name, setup := range cases {
		c := mocks.NewContestRepository(t)
		activeContest(c)
		p := mocks.NewParticipantRepository(t)
		withParticipants(p)
		asOwner(p)
		p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
		sq := mocks.NewSquareRepository(t)
		pub := mocks.NewContestEventPublisher(t)
		setup(sq, pub)

		svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), pub)
		_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 0, "owner@x.com")
		assert.Error(t, err, name)
	}
}

func TestUpdateParticipant_OwnerCanSetTheirOwnLimit(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{UserID: "owner@x.com", Role: model.ParticipantRoleOwner, MaxSquares: 25}, nil)
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "owner@x.com").Return(0, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), 0, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 0, got.MaxSquares)
}

func TestUpdateParticipant_UpdateDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(0, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), 5, "owner@x.com")
	assert.Error(t, err)
}

func allotParticipants() []model.ContestParticipant {
	return []model.ContestParticipant{
		{UserID: "owner@x.com", Role: model.ParticipantRoleOwner},
		{UserID: "a@x.com", Role: model.ParticipantRoleParticipant},
		{UserID: "b@x.com", Role: model.ParticipantRoleParticipant},
		{UserID: "c@x.com", Role: model.ParticipantRoleParticipant, MaxSquares: 5},
	}
}

func TestAllotSquares_GivesEveryoneWithoutSquaresTheSameNumber(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	asOwner(p)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(allotParticipants(), nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(90, nil)
	p.EXPECT().Update(mock.Anything, mock.MatchedBy(func(cp *model.ContestParticipant) bool {
		return (cp.UserID == "a@x.com" || cp.UserID == "b@x.com") && cp.MaxSquares == 5
	})).Return(nil).Times(2)
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishParticipantUpdated(mock.Anything, mock.Anything, "owner@x.com", mock.Anything).Return(nil).Times(2)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), pub)
	got, err := svc.AllotSquares(context.Background(), uuid.New(), 5, "owner@x.com")
	require.NoError(t, err)
	require.Len(t, got, 2, "the owner and anyone who already has squares are left alone")
	assert.Equal(t, "a@x.com", got[0].UserID)
	assert.Equal(t, "b@x.com", got[1].UserID)
}

func TestAllotSquares_NobodyWithoutSquares(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	asOwner(p)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestParticipant{
		{UserID: "owner@x.com", Role: model.ParticipantRoleOwner},
		{UserID: "c@x.com", Role: model.ParticipantRoleParticipant, MaxSquares: 5},
	}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), mocks.NewContestEventPublisher(t))
	got, err := svc.AllotSquares(context.Background(), uuid.New(), 5, "owner@x.com")
	require.NoError(t, err)
	assert.Empty(t, got)
}

func TestAllotSquares_PastThePoolGivesNobodyAnything(t *testing.T) {
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	asOwner(p)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(allotParticipants(), nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(91, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), mocks.NewContestEventPublisher(t))
	_, err := svc.AllotSquares(context.Background(), uuid.New(), 5, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotEnoughSquares)
}

func TestAllotSquares_Failures(t *testing.T) {
	cases := map[string]struct {
		setup func(c *mocks.ContestRepository, p *mocks.ParticipantRepository, pub *mocks.ContestEventPublisher)
		want  error
	}{
		"after kickoff": {func(c *mocks.ContestRepository, _ *mocks.ParticipantRepository, _ *mocks.ContestEventPublisher) {
			c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ2}, nil)
		}, errs.ErrParticipantsLocked},
		"list": {func(c *mocks.ContestRepository, p *mocks.ParticipantRepository, _ *mocks.ContestEventPublisher) {
			activeContest(c)
			p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"update": {func(c *mocks.ContestRepository, p *mocks.ParticipantRepository, _ *mocks.ContestEventPublisher) {
			activeContest(c)
			p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(allotParticipants(), nil)
			p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(0, nil)
			p.EXPECT().Update(mock.Anything, mock.Anything).Return(assert.AnError)
		}, assert.AnError},
		"event": {func(c *mocks.ContestRepository, p *mocks.ParticipantRepository, pub *mocks.ContestEventPublisher) {
			activeContest(c)
			p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(allotParticipants(), nil)
			p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(0, nil)
			p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)
			pub.EXPECT().PublishParticipantUpdated(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(assert.AnError)
		}, assert.AnError},
	}
	for name, tc := range cases {
		c := mocks.NewContestRepository(t)
		p := mocks.NewParticipantRepository(t)
		asOwner(p)
		pub := mocks.NewContestEventPublisher(t)
		tc.setup(c, p, pub)

		svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), pub)
		_, err := svc.AllotSquares(context.Background(), uuid.New(), 5, "owner@x.com")
		assert.ErrorIs(t, err, tc.want, name)
	}
}

func TestAllotSquares_ParticipantsCannotAllot(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.AllotSquares(context.Background(), uuid.New(), 5, "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestGetBans_OwnerListsThem(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	asOwner(p)
	want := []model.ContestBan{{UserID: "target@x.com"}}
	b := mocks.NewBanRepository(t)
	b.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(want, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), b, passTx(), anyEvents())
	got, err := svc.GetBans(context.Background(), uuid.New(), "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestGetBans_Failures(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.GetBans(context.Background(), uuid.New(), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)

	p = mocks.NewParticipantRepository(t)
	asOwner(p)
	b := mocks.NewBanRepository(t)
	b.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	svc = service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), b, passTx(), anyEvents())
	_, err = svc.GetBans(context.Background(), uuid.New(), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUnban_ResolvesThePseudonymAndLiftsTheBan(t *testing.T) {
	contestID := uuid.New()
	p := mocks.NewParticipantRepository(t)
	asOwner(p)
	b := mocks.NewBanRepository(t)
	b.EXPECT().GetAllByContestID(mock.Anything, contestID).Return([]model.ContestBan{{UserID: "other@x.com"}, {UserID: "target@x.com"}}, nil)
	b.EXPECT().Delete(mock.Anything, contestID, "target@x.com").Return(nil).Once()

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), b, passTx(), anyEvents())
	require.NoError(t, svc.Unban(context.Background(), contestID, pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestUnban_Failures(t *testing.T) {
	cases := map[string]struct {
		setup func(b *mocks.BanRepository)
		want  error
	}{
		"not banned": {func(b *mocks.BanRepository) {
			b.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestBan{{UserID: "other@x.com"}}, nil)
		}, errs.ErrNotBanned},
		"list": {func(b *mocks.BanRepository) {
			b.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
		"delete": {func(b *mocks.BanRepository) {
			b.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestBan{{UserID: "target@x.com"}}, nil)
			b.EXPECT().Delete(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))
		}, errs.ErrDatabaseUnavailable},
	}
	for name, tc := range cases {
		p := mocks.NewParticipantRepository(t)
		asOwner(p)
		b := mocks.NewBanRepository(t)
		tc.setup(b)

		svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), b, passTx(), anyEvents())
		assert.ErrorIs(t, svc.Unban(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"), tc.want, name)
	}
}

func TestUnban_ParticipantsCannotUnban(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Unban(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "caller@x.com"), errs.ErrInsufficientRole)
}

func TestRemoveParticipant_BanFailureFailsTheRemoval(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return(nil, nil)
	c := mocks.NewContestRepository(t)
	activeContest(c)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	asOwner(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)
	b := mocks.NewBanRepository(t)
	b.EXPECT().Create(mock.Anything, mock.Anything).Return(errors.New("db"))

	svc := service.NewParticipantService(p, c, sq, b, passTx(), mocks.NewContestEventPublisher(t))
	assert.Error(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_Terminal(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"), errs.ErrContestFinalized)
}

func TestRemoveParticipant_InProgressGhostsSquares(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	contestWithSquare := &model.Contest{
		Status:  model.ContestStatusQ2,
		Squares: []model.Square{{Owner: "target@x.com"}, {}},
	}
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(contestWithSquare, nil)
	sq.EXPECT().GhostByOwner(mock.Anything, mock.Anything, "target@x.com").Return([]model.Square{{Owner: model.GhostUser}}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "target@x.com"))
}

func TestRemoveParticipant_CannotRemoveOwner(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "owner@x.com"), errs.ErrCannotRemoveOwner)
}

func TestRemoveParticipant_Success(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return(nil, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_ReleasesSquaresUnderTheContestLock(t *testing.T) {
	tx := &mocks.Transactor{}
	tx.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error {
			return fn(context.WithValue(ctx, inTxKey{}, true))
		})
	inTx := mock.MatchedBy(func(ctx context.Context) bool { return ctx.Value(inTxKey{}) != nil })

	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(inTx, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "target@x.com"}, {Owner: "other"}},
	}, nil).Once()
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(inTx, mock.Anything, "target@x.com").Return([]model.Square{{}}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	outsideTx := mock.MatchedBy(func(ctx context.Context) bool { return ctx.Value(inTxKey{}) == nil })
	p.EXPECT().GetByContestAndUser(outsideTx, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(inTx, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(inTx, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), tx, anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestGetRoster_GivesManagersFullNamesWithoutEmails(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestParticipant{
		{UserID: "owner@x.com", DisplayName: "Olive  Owens"},
		{UserID: "target@x.com", DisplayName: "target@x.com"},
	}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	got, err := svc.GetRoster(context.Background(), uuid.New(), "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, []model.ParticipantIdentity{
		{UserID: pseudonym.Of("owner@x.com"), FullName: "Olive Owens"},
		{UserID: pseudonym.Of("target@x.com"), FullName: ""},
	}, got)
}

func TestGetRoster_ParticipantsCannotSeeIt(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.GetRoster(context.Background(), uuid.New(), "target@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestGetRoster_DBError(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	_, err := svc.GetRoster(context.Background(), uuid.New(), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_UnknownPseudonym(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestParticipant{{UserID: "target@x.com"}}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("stranger@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_UnauthorizedCallerNeverLocksOrLoadsTheParticipants(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
	p.AssertNotCalled(t, "GetAllByContestID", mock.Anything, mock.Anything)
}

func TestRemoveParticipant_PseudonymLookupError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), "u_somebody", "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_ContestNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestRemoveParticipant_ContestDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_AuthorizeFails(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_UnauthorizedCallerCannotLearnOwnerIdentity(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestRemoveParticipant_SelfRemovalSuccess(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "self@x.com").Return(nil, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "self@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "self@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("self@x.com"), "self@x.com"))
}

func TestRemoveParticipant_StrangerLeavingNeverLocksTheContest(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "stranger@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("stranger@x.com"), "stranger@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_LeavingLookupError(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "self@x.com").Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("self@x.com"), "self@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_OwnerCannotRemoveSelf(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "owner@x.com"), errs.ErrCannotRemoveOwner)
}

func TestRemoveParticipant_TargetNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_TargetDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_ClearSquaresFails(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "target@x.com"}, {}},
	}, nil).Once()
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return(nil, errors.New("db"))
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.Error(t, err, "the participant is kept when their squares could not be released")
}

func TestRemoveParticipant_GhostsSquaresOnceStarted(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusQ2,
		Squares: []model.Square{{Owner: "target@x.com", Value: "TG"}, {Owner: "other"}},
	}, nil)
	sq.EXPECT().GhostByOwner(mock.Anything, mock.Anything, "target@x.com").Return([]model.Square{{Owner: model.GhostUser, Value: "TG"}}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{UserID: "target@x.com", Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)
	events := mocks.NewContestEventPublisher(t)
	events.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, "target@x.com", mock.Anything).Return(nil).Once()
	events.EXPECT().PublishParticipantRemoved(mock.Anything, mock.Anything, "owner@x.com", mock.Anything).Return(nil).Once()

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), passTx(), events)
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_EventFailureFailsTheRemoval(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return(nil, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)
	events := mocks.NewContestEventPublisher(t)
	events.EXPECT().PublishParticipantRemoved(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), passTx(), events)
	assert.Error(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_WithSquaresToClear(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	contestWithSquare := &model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "target@x.com"}, {}},
	}
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(contestWithSquare, nil)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return([]model.Square{{}}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_DeleteFails(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return(nil, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(errors.New("db"))

	svc := service.NewParticipantService(p, c, sq, mocks.NewBanRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.Error(t, err)
}

func TestRemoveParticipant_FullBoardBeforeKickoffFreesTheirSquares(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	full := &model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "target@x.com", Value: "TG"}, {Owner: "owner@x.com", Value: "OW"}},
	}
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(full, nil)
	sq.EXPECT().ClearByOwner(mock.Anything, mock.Anything, "target@x.com").Return([]model.Square{{}}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withParticipants(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, bansRemovingTarget(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}
