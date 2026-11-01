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
func withPlayers(p *mocks.ParticipantRepository) {
	players := make([]model.ContestParticipant, 0, 5)
	for _, email := range []string{"owner@x.com", "target@x.com", "caller@x.com", "self@x.com", "owner-target@x.com"} {
		players = append(players, model.ContestParticipant{UserID: email})
	}
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(players, nil).Maybe()
}

func TestAuthorize_PublicViewSkipsParticipantLookup(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPublic, nil)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.NoError(t, svc.Authorize(context.Background(), uuid.New(), "anyone", service.ActionView))
}

func TestAuthorize_VisibilityNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibility(""), database.ErrNotFound)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrContestNotFound)
}

func TestAuthorize_VisibilityDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibility(""), errors.New("boom"))

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrDatabaseUnavailable)
}

func TestAuthorize_NotParticipant(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPrivate, nil)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrNotParticipant)
}

func TestAuthorize_ParticipantDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetVisibilityByID(mock.Anything, mock.Anything).Return(model.ContestVisibilityPrivate, nil)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("boom"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionView), errs.ErrDatabaseUnavailable)
}

func TestAuthorize_InsufficientRole(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleViewer}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionEditContest), errs.ErrInsufficientRole)
}

func TestAuthorize_OwnerCanDelete(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.NoError(t, svc.Authorize(context.Background(), uuid.New(), "u", service.ActionDeleteContest))
}

func TestGetParticipants_Success(t *testing.T) {
	want := []model.ContestParticipant{{UserID: "u"}}
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(want, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	got, err := svc.GetParticipants(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Equal(t, want, got)
}

func TestGetParticipants_Error(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.GetParticipants(context.Background(), uuid.New())
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_ContestNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestUpdateParticipant_TerminalContest(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestFinalized)
}

func TestUpdateParticipant_AfterKickoff(t *testing.T) {
	for _, status := range []model.ContestStatus{model.ContestStatusQ1, model.ContestStatusQ4} {
		c := mocks.NewContestRepository(t)
		c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: status}, nil)

		svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
		maxSquares := 20
		_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSquares}, "owner@x.com")
		assert.ErrorIs(t, err, errs.ErrParticipantsLocked, status)
	}
}

func TestUpdateParticipant_CannotChangeOwner(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	role := "viewer"
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), &model.UpdateParticipantRequest{Role: &role}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrCannotChangeOwner)
}

func TestUpdateParticipant_MaxSquaresBelowClaimed(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(8, nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 5
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrSquareLimitTooLow)
}

func TestUpdateParticipant_Success(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(0, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(10, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)
	contestID := uuid.New()
	pub := mocks.NewContestEventPublisher(t)
	pub.EXPECT().PublishParticipantUpdated(mock.Anything, contestID, "owner@x.com", mock.MatchedBy(func(p *model.ContestParticipant) bool {
		return p.Role == model.ParticipantRoleViewer
	})).Return(nil).Once()

	svc := service.NewParticipantService(p, c, sq, passTx(), pub)
	role := "viewer"
	got, err := svc.UpdateParticipant(context.Background(), contestID, pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{Role: &role}, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, model.ParticipantRoleViewer, got.Role)
	assert.Equal(t, 0, got.MaxSquares)
}

func TestUpdateParticipant_ViewerCannotHaveSquares(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleViewer}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	maxSq := 5
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrViewerCannotHaveSquares)
}

func TestUpdateParticipant_ParticipantZeroSquares(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 5}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	maxSq := 0
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrInvalidSquareCount)
}

func TestUpdateParticipant_OwnerZeroSquaresAllowed(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner-target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner, MaxSquares: 5}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "owner-target@x.com").Return(0, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(5, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 0
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("owner-target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 0, got.MaxSquares)
}

func TestUpdateParticipant_ContestDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(mocks.NewParticipantRepository(t), c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_AuthorizeFails(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestUpdateParticipant_TargetNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestUpdateParticipant_TargetDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_CountSquaresDBError(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(0, errors.New("db"))

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 5
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_TotalAllocatedDBError(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(3, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(0, errors.New("db"))

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 8
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateParticipant_ExceedsSquareLimit(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(3, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(96, nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 15
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotEnoughSquares)
}

func TestUpdateParticipant_UpdateDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	role := "viewer"
	_, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{Role: &role}, "owner@x.com")
	assert.Error(t, err)
}

func TestUpdateParticipant_MaxSquaresSuccess(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant, MaxSquares: 10}, nil)
	sq.EXPECT().CountByOwner(mock.Anything, mock.Anything, "target@x.com").Return(3, nil)
	p.EXPECT().GetTotalAllocatedSquares(mock.Anything, mock.Anything).Return(50, nil)
	p.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	maxSq := 8
	got, err := svc.UpdateParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), &model.UpdateParticipantRequest{MaxSquares: &maxSq}, "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, 8, got.MaxSquares)
}

func TestRemoveParticipant_Terminal(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
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
	sq.EXPECT().Ghost(mock.Anything, mock.Anything).Return(&model.Square{}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "target@x.com"))
}

func TestRemoveParticipant_CannotRemoveOwner(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "owner@x.com"), errs.ErrCannotRemoveOwner)
}

func TestRemoveParticipant_Success(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_ReleasesSquaresLoadedUnderTheContestLock(t *testing.T) {
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
	sq.EXPECT().Clear(inTx, mock.MatchedBy(func(s *model.Square) bool { return s.Owner == "target@x.com" })).Return(&model.Square{}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	outsideTx := mock.MatchedBy(func(ctx context.Context) bool { return ctx.Value(inTxKey{}) == nil })
	p.EXPECT().GetByContestAndUser(outsideTx, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(inTx, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(inTx, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, tx, anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestGetRoster_GivesManagersFullNamesWithoutEmails(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestParticipant{
		{UserID: "owner@x.com", DisplayName: "Olive  Owens"},
		{UserID: "target@x.com", DisplayName: "target@x.com"},
	}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	got, err := svc.GetRoster(context.Background(), uuid.New(), "owner@x.com")
	require.NoError(t, err)
	assert.Equal(t, []model.ParticipantIdentity{
		{UserID: pseudonym.Of("owner@x.com"), FullName: "Olive Owens"},
		{UserID: pseudonym.Of("target@x.com"), FullName: ""},
	}, got)
}

func TestGetRoster_PlayersCannotSeeIt(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.GetRoster(context.Background(), uuid.New(), "target@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestGetRoster_DBError(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	_, err := svc.GetRoster(context.Background(), uuid.New(), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_UnknownPseudonym(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestParticipant{{UserID: "target@x.com"}}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("stranger@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_UnauthorizedCallerNeverLocksOrLoadsThePlayers(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
	p.AssertNotCalled(t, "GetAllByContestID", mock.Anything, mock.Anything)
}

func TestRemoveParticipant_PseudonymLookupError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), "u_somebody", "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_ContestNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestRemoveParticipant_ContestDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_AuthorizeFails(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_UnauthorizedCallerCannotLearnOwnerIdentity(t *testing.T) {
	c := mocks.NewContestRepository(t)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "caller@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "caller@x.com")
	assert.ErrorIs(t, err, errs.ErrInsufficientRole)
}

func TestRemoveParticipant_SelfRemovalSuccess(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "self@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "self@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("self@x.com"), "self@x.com"))
}

func TestRemoveParticipant_StrangerLeavingNeverLocksTheContest(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "stranger@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("stranger@x.com"), "stranger@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_LeavingLookupError(t *testing.T) {
	p := mocks.NewParticipantRepository(t)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "self@x.com").Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, mocks.NewContestRepository(t), mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("self@x.com"), "self@x.com")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestRemoveParticipant_OwnerCannotRemoveSelf(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	assert.ErrorIs(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("owner@x.com"), "owner@x.com"), errs.ErrCannotRemoveOwner)
}

func TestRemoveParticipant_TargetNotFound(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, database.ErrNotFound)

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestRemoveParticipant_TargetDBError(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(nil, errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
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
	sq.EXPECT().Clear(mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
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
	sq.EXPECT().Ghost(mock.Anything, mock.Anything).Return(&model.Square{Owner: model.GhostUser, Value: "TG"}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{UserID: "target@x.com", Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)
	events := mocks.NewContestEventPublisher(t)
	events.EXPECT().PublishSquareUpdate(mock.Anything, mock.Anything, "target@x.com", mock.Anything).Return(nil).Once()
	events.EXPECT().PublishParticipantRemoved(mock.Anything, mock.Anything, "owner@x.com", mock.Anything).Return(nil).Once()

	svc := service.NewParticipantService(p, c, sq, passTx(), events)
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_EventFailureFailsTheRemoval(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)
	events := mocks.NewContestEventPublisher(t)
	events.EXPECT().PublishParticipantRemoved(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errors.New("outbox"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), events)
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
	sq.EXPECT().Clear(mock.Anything, mock.Anything).Return(&model.Square{}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}

func TestRemoveParticipant_ClearSquareFails(t *testing.T) {
	sq := mocks.NewSquareRepository(t)
	contestWithSquare := &model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "target@x.com"}, {}},
	}
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(contestWithSquare, nil)
	sq.EXPECT().Clear(mock.Anything, mock.Anything).Return(nil, errors.New("clear failed"))
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	err := svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com")
	assert.Error(t, err)
}

func TestRemoveParticipant_DeleteFails(t *testing.T) {
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(errors.New("db"))

	svc := service.NewParticipantService(p, c, mocks.NewSquareRepository(t), passTx(), anyEvents())
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
	sq.EXPECT().Clear(mock.Anything, mock.Anything).Return(&model.Square{}, nil).Once()
	p := mocks.NewParticipantRepository(t)
	withPlayers(p)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "owner@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleOwner}, nil)
	p.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, "target@x.com").Return(&model.ContestParticipant{Role: model.ParticipantRoleParticipant}, nil)
	p.EXPECT().Delete(mock.Anything, mock.Anything, "target@x.com").Return(nil)

	svc := service.NewParticipantService(p, c, sq, passTx(), anyEvents())
	require.NoError(t, svc.RemoveParticipant(context.Background(), uuid.New(), pseudonym.Of("target@x.com"), "owner@x.com"))
}
