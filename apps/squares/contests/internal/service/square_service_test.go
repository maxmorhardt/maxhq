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
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func squareSvc(repo *mocks.ContestRepository, squares *mocks.SquareRepository, pRepo *mocks.ParticipantRepository, pSvc *mocks.ParticipantService) service.SquareService {
	return service.NewSquareService(squares, repo, pRepo, anyUser(), passTx(), anyEvents(), pSvc)
}

func TestClaim_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		Claim(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClaim_SquareNotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), pSvc).
		Claim(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotFound)
}

func TestClaim_NotParticipant(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), pRepo, pSvc).
		Claim(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestClaim_LimitReached(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 2}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(2, nil)

	_, err := squareSvc(repo, squares, pRepo, pSvc).
		Claim(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareLimitReached)
}

func TestClaim_ClaimsNotFound(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	_, err := squareSvc(repo, squares, pRepo, pSvc).
		Claim(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrClaimsNotFound)
}

func TestClaim_Success(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	squares.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Square{ID: squareID, Value: "AB", Owner: "u", OwnerName: "Display Name"}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
	got, err := squareSvc(repo, squares, pRepo, pSvc).
		Claim(ctx, uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Equal(t, "AB", got.Value)
	assert.Equal(t, "Display Name", got.OwnerName)
}

func TestClaim_MissingInitials(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	userRepo := &mocks.UserRepository{}
	userRepo.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.User{Email: "u", DefaultInitials: ""}, nil).Maybe()
	svc := service.NewSquareService(squares, repo, pRepo, userRepo, passTx(), anyEvents(), pSvc)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
	_, err := svc.Claim(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrMissingInitials)
}

func TestClear_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		Clear(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClear_SquareNotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		Clear(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotFound)
}

func TestClear_Success(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}, {}}}, nil)
	squares.EXPECT().Clear(mock.Anything, mock.Anything).Return(&model.Square{ID: squareID}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	got, err := squareSvc(repo, squares, mocks.NewParticipantRepository(t), pSvc).
		Clear(context.Background(), uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Empty(t, got.Owner)
}

func TestClearByOwner_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearByOwner(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClearByOwner_NotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearByOwner(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestClearByOwner_RepoError(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	squares.EXPECT().ClearByOwner(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	_, err := squareSvc(repo, squares, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearByOwner(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestClearByOwner_Success(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	contestID := uuid.New()
	cleared := []model.Square{{ID: uuid.New(), ContestID: contestID}, {ID: uuid.New(), ContestID: contestID}}
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{ID: contestID, Status: model.ContestStatusActive}, nil)
	squares.EXPECT().ClearByOwner(mock.Anything, contestID, "u").Return(cleared, nil)

	got, err := squareSvc(repo, squares, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearByOwner(context.Background(), contestID, "u")
	require.NoError(t, err)
	assert.Len(t, got, 2)
}

func TestClaim_RepoError(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	squares.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := squareSvc(repo, squares, pRepo, pSvc).Claim(ctx, uuid.New(), squareID, "u")
	assert.Error(t, err)
}

func TestClaim_LostRaceToAnotherUser(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	squares.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrSquareTaken)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := squareSvc(repo, squares, pRepo, pSvc).Claim(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareTaken)
}

func TestClaim_LimitReachedConcurrently(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	squares.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrSquareLimitReached)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	squares.EXPECT().CountByOwner(mock.Anything, mock.Anything, mock.Anything).Return(4, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := squareSvc(repo, squares, pRepo, pSvc).Claim(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareLimitReached)
}

func TestClaim_ReEditOwnSquare(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}, {}}}, nil)
	squares.EXPECT().Claim(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&model.Square{ID: squareID, Value: "XY", Owner: "u"}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)

	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	got, err := squareSvc(repo, squares, pRepo, pSvc).Claim(ctx, uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Equal(t, "XY", got.Value)
}

func TestClaim_OwnedByAnotherUser(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "other"}, {}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), pSvc).
		Claim(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func TestClear_OwnerDespiteAuthFail(t *testing.T) {
	squares := mocks.NewSquareRepository(t)
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}, {}}}, nil)
	squares.EXPECT().Clear(mock.Anything, mock.Anything).Return(&model.Square{ID: squareID}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	got, err := squareSvc(repo, squares, mocks.NewParticipantRepository(t), pSvc).
		Clear(context.Background(), uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Empty(t, got.Owner)
}

func TestClear_Unauthorized(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "someone"}, {}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), pSvc).
		Clear(context.Background(), uuid.New(), squareID, "stranger")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func claimCtx() context.Context {
	return context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
}

func authorized(t *testing.T, err error) *mocks.ParticipantService {
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, "u", service.ActionClaimSquare).Return(err)
	return pSvc
}

func TestClaimRandom_ClaimsAndPublishesEach(t *testing.T) {
	squareRepo := mocks.NewSquareRepository(t)
	contestID := uuid.New()
	squares := []model.Square{{ID: uuid.New(), Owner: "u"}, {ID: uuid.New(), Owner: "u"}}
	repo := mocks.NewContestRepository(t)
	squareRepo.EXPECT().ClaimRandom(mock.Anything, contestID, 3, "AB", "u", "Display Name").Return(squares, nil)

	events := &mocks.ContestEventPublisher{}
	events.On("PublishSquareUpdate", mock.Anything, contestID, "u", mock.Anything).Return(nil).Times(2)

	svc := service.NewSquareService(squareRepo, repo, mocks.NewParticipantRepository(t), anyUser(), passTx(), events, authorized(t, nil))
	got, err := svc.ClaimRandom(claimCtx(), contestID, 3, "u")

	require.NoError(t, err)
	assert.Equal(t, 3, got.Requested)
	assert.Len(t, got.Squares, 2)
	events.AssertExpectations(t)
}

func TestClaimRandom_PassesThroughNotParticipant(t *testing.T) {
	_, err := squareSvc(mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), authorized(t, errs.ErrNotParticipant)).
		ClaimRandom(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestClaimRandom_ViewerCannotClaim(t *testing.T) {
	_, err := squareSvc(mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), authorized(t, errs.ErrInsufficientRole)).
		ClaimRandom(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func TestClaimRandom_NeedsClaimsAndInitials(t *testing.T) {
	_, err := squareSvc(mocks.NewContestRepository(t), mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), authorized(t, nil)).
		ClaimRandom(context.Background(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrClaimsNotFound)

	userRepo := &mocks.UserRepository{}
	userRepo.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&model.User{Email: "u"}, nil)
	svc := service.NewSquareService(mocks.NewSquareRepository(t), mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), userRepo, passTx(), anyEvents(), authorized(t, nil))
	_, err = svc.ClaimRandom(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrMissingInitials)

	failing := &mocks.UserRepository{}
	failing.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, assert.AnError)
	svc = service.NewSquareService(mocks.NewSquareRepository(t), mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), failing, passTx(), anyEvents(), authorized(t, nil))
	_, err = svc.ClaimRandom(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestClaimRandom_ReturnsRepositoryErrors(t *testing.T) {
	for _, want := range []error{errs.ErrSquareLimitReached, errs.ErrNoEmptySquares, assert.AnError} {
		repo := mocks.NewContestRepository(t)
		squares := mocks.NewSquareRepository(t)
		squares.EXPECT().ClaimRandom(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, want)

		_, err := squareSvc(repo, squares, mocks.NewParticipantRepository(t), authorized(t, nil)).ClaimRandom(claimCtx(), uuid.New(), 2, "u")
		assert.ErrorIs(t, err, want)
	}
}

func TestClear_FullBoardIsLocked(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).
		Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}, {Owner: "v"}}}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		Clear(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrBoardLocked)
}

func TestClearByOwner_FullBoardIsLocked(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).
		Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{Owner: "u"}, {Owner: "v"}}}, nil)

	_, err := squareSvc(repo, mocks.NewSquareRepository(t), mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearByOwner(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrBoardLocked)
}
