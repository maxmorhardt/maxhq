package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func contestSvc(repo *mocks.ContestRepository, pRepo *mocks.ParticipantRepository, pSvc *mocks.ParticipantService) service.ContestService {
	return service.NewContestService(repo, pRepo, &mocks.GameProjectionRepository{}, anyUser(), passTx(), anyEvents(), pSvc)
}

func passTx() *mocks.Transactor {
	m := &mocks.Transactor{}
	m.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }).Maybe()
	return m
}

func anyEvents() *mocks.ContestEventPublisher {
	m := &mocks.ContestEventPublisher{}
	for _, method := range []string{"PublishSquareUpdate", "PublishContestUpdate", "PublishQuarterResult", "PublishContestDeleted", "PublishParticipantRemoved"} {
		m.On(method, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	}
	m.On("PublishContestDeleted", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	m.On("PublishParticipantAdded", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	return m
}

func anyUser() *mocks.UserProjectionRepository {
	m := &mocks.UserProjectionRepository{}
	m.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.User{Email: "u", DefaultInitials: "AB"}, nil).Maybe()
	return m
}

func contestSvcWithGame(repo *mocks.ContestRepository, pRepo *mocks.ParticipantRepository, gameRepo *mocks.GameProjectionRepository, pSvc *mocks.ParticipantService) service.ContestService {
	return service.NewContestService(repo, pRepo, gameRepo, anyUser(), passTx(), anyEvents(), pSvc)
}

func okAuth(t *testing.T) *mocks.ParticipantService {
	m := mocks.NewParticipantService(t)
	m.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	return m
}

func TestCreateContest_AlreadyExists(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(true, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n"}, "o")
	assert.ErrorIs(t, err, errs.ErrContestAlreadyExists)
}

func TestCreateContest_ExistsCheckError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n"}, "o")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestCreateContest_WithGame(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	repo.EXPECT().Create(mock.Anything, mock.MatchedBy(func(c *model.Contest) bool {
		return c.GameID != nil && *c.GameID == gameID && c.HomeTeam == "Chiefs" && c.AwayTeam == "Eagles"
	}), mock.Anything).Return(nil)
	gameRepo := mocks.NewGameProjectionRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID, HomeTeam: "Chiefs", AwayTeam: "Eagles"}, nil)

	got, err := contestSvcWithGame(repo, mocks.NewParticipantRepository(t), gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", Visibility: "public", MaxSquares: 10, GameID: gameID.String()}, "o")
	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPublic, got.Visibility)
	assert.Equal(t, model.ContestStatusActive, got.Status)
	require.NotNil(t, got.GameID)
	assert.Equal(t, gameID, *got.GameID)
	assert.Equal(t, "Chiefs", got.HomeTeam)
	assert.Equal(t, "Eagles", got.AwayTeam)
}

func TestCreateContest_InvalidGameID(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", GameID: "nope"}, "o")
	assert.ErrorIs(t, err, errs.ErrGameNotFound)
}

func TestCreateContest_GameLookupError(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	gameRepo := mocks.NewGameProjectionRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(nil, errors.New("db"))

	_, err := contestSvcWithGame(repo, mocks.NewParticipantRepository(t), gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", GameID: gameID.String()}, "o")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestCreateContest_GameNotFound(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	gameRepo := mocks.NewGameProjectionRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(nil, gorm.ErrRecordNotFound)

	_, err := contestSvcWithGame(repo, mocks.NewParticipantRepository(t), gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10, GameID: gameID.String()}, "o")
	assert.ErrorIs(t, err, errs.ErrGameNotFound)
}

func TestUpdateContest_NotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{}, "u", nil)
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestUpdateContest_GetDBError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, errors.New("boom"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{}, "u", nil)
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestUpdateContest_Terminal(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{}, "u", nil)
	assert.ErrorIs(t, err, errs.ErrContestFinalized)
}

func TestUpdateContest_Unauthorized(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{}, "u", nil)
	assert.ErrorIs(t, err, errs.ErrUnauthorizedContestEdit)
}

func TestUpdateContest_NoChanges(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Visibility: model.ContestVisibilityPrivate}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	private := "private"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{Visibility: &private}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPrivate, got.Visibility)
}

func TestUpdateContest_VisibilityChange(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Visibility: model.ContestVisibilityPublic}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	private := "private"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{Visibility: &private}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPrivate, got.Visibility)
}

func TestUpdateContest_ChangesVisibility(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Visibility: model.ContestVisibilityPrivate, GameID: &gameID}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	public := "public"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{Visibility: &public}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPublic, got.Visibility)
}

func orderedLabels(t *testing.T) []byte {
	t.Helper()
	b, err := json.Marshal([]int8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9})
	require.NoError(t, err)
	return b
}

func TestDeleteContest_Terminal(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusFinished}, nil)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestFinalized)
}

func TestDeleteContest_NotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestDeleteContest_Unauthorized(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedContestDelete)
}

func TestDeleteContest_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	repo.EXPECT().Delete(mock.Anything, mock.Anything).Return(nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		DeleteContest(context.Background(), uuid.New(), "u")
	require.NoError(t, err)
}

func TestClaimSquare_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClaimSquare(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClaimSquare_SquareNotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		ClaimSquare(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestClaimSquare_NotParticipant(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)

	_, err := contestSvc(repo, pRepo, pSvc).
		ClaimSquare(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestClaimSquare_LimitReached(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 2}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(2, nil)

	_, err := contestSvc(repo, pRepo, pSvc).
		ClaimSquare(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareLimitReached)
}

func TestClaimSquare_ClaimsNotFound(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	_, err := contestSvc(repo, pRepo, pSvc).
		ClaimSquare(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrClaimsNotFound)
}

func TestClaimSquare_Success(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	repo.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.Square{ID: squareID, Value: "AB", Owner: "u", OwnerName: "Display Name"}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
	got, err := contestSvc(repo, pRepo, pSvc).
		ClaimSquare(ctx, uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Equal(t, "AB", got.Value)
	assert.Equal(t, "Display Name", got.OwnerName)
}

func TestClaimSquare_MissingInitials(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	userRepo := &mocks.UserProjectionRepository{}
	userRepo.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.User{Email: "u", DefaultInitials: ""}, nil).Maybe()
	svc := service.NewContestService(repo, pRepo, &mocks.GameProjectionRepository{}, userRepo, passTx(), anyEvents(), pSvc)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
	_, err := svc.ClaimSquare(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrMissingInitials)
}

func TestClearSquare_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearSquare(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClearSquare_SquareNotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearSquare(context.Background(), uuid.New(), uuid.New(), "u")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestClearSquare_Success(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}}}, nil)
	repo.EXPECT().ClearSquare(mock.Anything, mock.Anything).Return(&model.Square{ID: squareID}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		ClearSquare(context.Background(), uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Empty(t, got.Owner)
}

func TestClearUserSquares_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearUserSquares(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrSquareNotEditable)
}

func TestClearUserSquares_NotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearUserSquares(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestClearUserSquares_RepoError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	repo.EXPECT().ClearSquaresByOwner(mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearUserSquares(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestClearUserSquares_Success(t *testing.T) {
	contestID := uuid.New()
	cleared := []model.Square{{ID: uuid.New(), ContestID: contestID}, {ID: uuid.New(), ContestID: contestID}}
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{ID: contestID, Status: model.ContestStatusActive}, nil)
	repo.EXPECT().ClearSquaresByOwner(mock.Anything, contestID, "u").Return(cleared, nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ClearUserSquares(context.Background(), contestID, "u")
	require.NoError(t, err)
	assert.Len(t, got, 2)
}

func TestCreateContest_RepoError(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	repo.EXPECT().Create(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))
	gameRepo := mocks.NewGameProjectionRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID}, nil)

	_, err := contestSvcWithGame(repo, mocks.NewParticipantRepository(t), gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10, GameID: gameID.String()}, "o")
	assert.Error(t, err)
}

func TestUpdateContest_SaveError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Visibility: model.ContestVisibilityPrivate}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	public := "public"
	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{Visibility: &public}, "u", nil)
	assert.Error(t, err)
}

func TestApplyQuarterResult_StepsStatusAndStamps(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	contest := &model.Contest{
		ID: uuid.New(), Status: model.ContestStatusQ1,
		XLabels: orderedLabels(t), YLabels: orderedLabels(t),
		Squares: []model.Square{{Row: 3, Col: 7, Owner: "winner", OwnerName: "Win Ner"}},
	}
	repo.EXPECT().ApplyQuarterResults(mock.Anything, contest, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ApplyQuarterResult(context.Background(), contest, 1, 17, 23)

	require.NoError(t, err)
	assert.Equal(t, "winner", got.Winner)
	assert.Equal(t, "system", got.CreatedBy)
	assert.Equal(t, model.ContestStatusQ2, contest.Status)
}

func TestApplyQuarterResult_InvalidQuarter(t *testing.T) {
	repo := mocks.NewContestRepository(t)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ApplyQuarterResult(context.Background(), &model.Contest{ID: uuid.New()}, 5, 17, 23)

	assert.ErrorIs(t, err, errs.ErrInvalidQuarter)
}

func TestApplyQuarterResult_WinnerNotDeterminable(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	unlocked, err := json.Marshal([]int8{-1, -1, -1, -1, -1, -1, -1, -1, -1, -1})
	require.NoError(t, err)

	_, err = contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		ApplyQuarterResult(context.Background(), &model.Contest{ID: uuid.New(), XLabels: unlocked, YLabels: unlocked}, 1, 17, 23)

	assert.ErrorIs(t, err, errs.ErrWinnerNotDeterminable)
}

func TestFinalizeFromScores_RecordsEveryQuarter(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	contest := &model.Contest{
		ID: uuid.New(), Status: model.ContestStatusActive,
		Squares: []model.Square{{Row: 3, Col: 7, Owner: "winner", OwnerName: "Win Ner"}},
	}

	var persisted []model.QuarterResult
	repo.EXPECT().ApplyQuarterResults(mock.Anything, contest, mock.Anything).
		Run(func(_ context.Context, _ *model.Contest, results []model.QuarterResult) {
			persisted = results
		}).Return(nil)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		FinalizeFromScores(context.Background(), contest, []model.GameScore{
			{Quarter: 1, HomeScore: 7, AwayScore: 3},
			{Quarter: 4, HomeScore: 21, AwayScore: 17},
		})

	require.NoError(t, err)
	assert.Equal(t, model.ContestStatusFinished, contest.Status)
	assert.Equal(t, "system", contest.UpdatedBy)
	require.Len(t, persisted, 2)
	assert.Equal(t, 1, persisted[0].Quarter)
	assert.Equal(t, 4, persisted[1].Quarter)
}

func TestFinalizeFromScores_ApplyError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ApplyQuarterResults(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		FinalizeFromScores(context.Background(), &model.Contest{ID: uuid.New()}, nil)

	assert.Error(t, err)
}

func TestDeleteContest_RepoError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	repo.EXPECT().Delete(mock.Anything, mock.Anything).Return(errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).DeleteContest(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestClaimSquare_RepoError(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	repo.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := contestSvc(repo, pRepo, pSvc).ClaimSquare(ctx, uuid.New(), squareID, "u")
	assert.Error(t, err)
}

func TestClaimSquare_LostRaceToAnotherUser(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	repo.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrSquareTaken)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(0, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := contestSvc(repo, pRepo, pSvc).ClaimSquare(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareTaken)
}

func TestClaimSquare_LimitReachedConcurrently(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID}}}, nil)
	repo.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errs.ErrSquareLimitReached)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)
	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)
	pRepo.EXPECT().CountSquaresByUser(mock.Anything, mock.Anything, mock.Anything).Return(4, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	_, err := contestSvc(repo, pRepo, pSvc).ClaimSquare(ctx, uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrSquareLimitReached)
}

func TestClaimSquare_ReEditOwnSquare(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}}}, nil)
	repo.EXPECT().ClaimSquare(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&model.Square{ID: squareID, Value: "XY", Owner: "u"}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
	pRepo := mocks.NewParticipantRepository(t)

	pRepo.EXPECT().GetByContestAndUser(mock.Anything, mock.Anything, mock.Anything).Return(&model.ContestParticipant{MaxSquares: 5}, nil)

	ctx := context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "N"})
	got, err := contestSvc(repo, pRepo, pSvc).ClaimSquare(ctx, uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Equal(t, "XY", got.Value)
}

func TestClaimSquare_OwnedByAnotherUser(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "other"}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		ClaimSquare(context.Background(), uuid.New(), squareID, "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func TestClearSquare_OwnerDespiteAuthFail(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "u"}}}, nil)
	repo.EXPECT().ClearSquare(mock.Anything, mock.Anything).Return(&model.Square{ID: squareID}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		ClearSquare(context.Background(), uuid.New(), squareID, "u")
	require.NoError(t, err)
	assert.Empty(t, got.Owner)
}

func TestClearSquare_Unauthorized(t *testing.T) {
	squareID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Squares: []model.Square{{ID: squareID, Owner: "someone"}}}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		ClearSquare(context.Background(), uuid.New(), squareID, "stranger")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func TestUpdateContest_StaleIfMatchVersion(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Version: 5}, nil)

	stale := int64(4)
	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{}, "u", &stale)

	assert.ErrorIs(t, err, errs.ErrVersionConflict)
}

func TestUpdateContest_ConcurrentWriteConflicts(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, Version: 5}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errs.ErrVersionConflict)

	current := int64(5)
	public := "public"
	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{Visibility: &public}, "u", &current)

	assert.ErrorIs(t, err, errs.ErrVersionConflict)
}

func TestAutoStart(t *testing.T) {
	contest := &model.Contest{ID: uuid.New(), Status: model.ContestStatusActive}
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().Update(mock.Anything, contest).Return(nil)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).AutoStart(context.Background(), contest)

	require.NoError(t, err)
	assert.Equal(t, model.ContestStatusQ1, contest.Status)
	assert.Equal(t, "system", contest.UpdatedBy)
}

func TestAutoStart_UpdateFails(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errs.ErrVersionConflict)

	err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		AutoStart(context.Background(), &model.Contest{ID: uuid.New(), Status: model.ContestStatusActive})

	assert.ErrorIs(t, err, errs.ErrVersionConflict)
}

func claimCtx() context.Context {
	return context.WithValue(context.Background(), api.ClaimsKey, &api.Claims{Name: "Display Name"})
}

func authorized(t *testing.T, err error) *mocks.ParticipantService {
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, "u", service.ActionClaimSquare).Return(err)
	return pSvc
}

func TestClaimRandomSquares_ClaimsAndPublishesEach(t *testing.T) {
	contestID := uuid.New()
	squares := []model.Square{{ID: uuid.New(), Owner: "u"}, {ID: uuid.New(), Owner: "u"}}
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ClaimRandomSquares(mock.Anything, contestID, 3, "AB", "u", "Display Name").Return(squares, nil)

	events := &mocks.ContestEventPublisher{}
	events.On("PublishSquareUpdate", mock.Anything, contestID, "u", mock.Anything).Return(nil).Times(2)

	svc := service.NewContestService(repo, mocks.NewParticipantRepository(t), &mocks.GameProjectionRepository{}, anyUser(), passTx(), events, authorized(t, nil))
	got, err := svc.ClaimRandomSquares(claimCtx(), contestID, 3, "u")

	require.NoError(t, err)
	assert.Equal(t, 3, got.Requested)
	assert.Len(t, got.Squares, 2)
	events.AssertExpectations(t)
}

func TestClaimRandomSquares_PassesThroughNotParticipant(t *testing.T) {
	_, err := contestSvc(mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), authorized(t, errs.ErrNotParticipant)).
		ClaimRandomSquares(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrNotParticipant)
}

func TestClaimRandomSquares_ViewerCannotClaim(t *testing.T) {
	_, err := contestSvc(mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), authorized(t, errs.ErrInsufficientRole)).
		ClaimRandomSquares(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedSquareEdit)
}

func TestClaimRandomSquares_NeedsClaimsAndInitials(t *testing.T) {
	_, err := contestSvc(mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), authorized(t, nil)).
		ClaimRandomSquares(context.Background(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrClaimsNotFound)

	userRepo := &mocks.UserProjectionRepository{}
	userRepo.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&model.User{Email: "u"}, nil)
	svc := service.NewContestService(mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), &mocks.GameProjectionRepository{}, userRepo, passTx(), anyEvents(), authorized(t, nil))
	_, err = svc.ClaimRandomSquares(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrMissingInitials)

	failing := &mocks.UserProjectionRepository{}
	failing.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, assert.AnError)
	svc = service.NewContestService(mocks.NewContestRepository(t), mocks.NewParticipantRepository(t), &mocks.GameProjectionRepository{}, failing, passTx(), anyEvents(), authorized(t, nil))
	_, err = svc.ClaimRandomSquares(claimCtx(), uuid.New(), 1, "u")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestClaimRandomSquares_ReturnsRepositoryErrors(t *testing.T) {
	for _, want := range []error{errs.ErrSquareLimitReached, errs.ErrNoEmptySquares, assert.AnError} {
		repo := mocks.NewContestRepository(t)
		repo.EXPECT().ClaimRandomSquares(mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, want)

		_, err := contestSvc(repo, mocks.NewParticipantRepository(t), authorized(t, nil)).ClaimRandomSquares(claimCtx(), uuid.New(), 2, "u")
		assert.ErrorIs(t, err, want)
	}
}
