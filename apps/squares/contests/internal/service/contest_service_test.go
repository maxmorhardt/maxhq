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
	m.On("PublishQuarterResultRollback", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
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

func TestCreateContest_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	repo.EXPECT().Create(mock.Anything, mock.Anything, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", Visibility: "public", MaxSquares: 10}, "o")
	require.NoError(t, err)
	assert.Equal(t, model.ContestVisibilityPublic, got.Visibility)
	assert.Equal(t, model.ContestStatusActive, got.Status)
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
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10, GameID: gameID.String()}, "o")
	require.NoError(t, err)
	require.NotNil(t, got.GameID)
	assert.Equal(t, gameID, *got.GameID)
	assert.Equal(t, "Chiefs", got.HomeTeam)
	assert.Equal(t, "Eagles", got.AwayTeam)
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
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, HomeTeam: "A"}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	homeTeam := "A"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{HomeTeam: &homeTeam}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, "A", got.HomeTeam)
}

func TestUpdateContest_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, HomeTeam: "A"}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	homeTeam := "B"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{HomeTeam: &homeTeam}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, "B", got.HomeTeam)
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

func TestUpdateContest_VisibilityEditableForGameLinked(t *testing.T) {
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

func TestUpdateContest_GameLinkedIgnoresTeamNames(t *testing.T) {
	gameID := uuid.New()

	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, HomeTeam: "A", AwayTeam: "B", GameID: &gameID}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	homeTeam, awayTeam := "X", "Y"
	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{HomeTeam: &homeTeam, AwayTeam: &awayTeam}, "u", nil)
	require.NoError(t, err)
	assert.Equal(t, "A", got.HomeTeam)
	assert.Equal(t, "B", got.AwayTeam)
}

func TestStartContest_NotActive(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		StartContest(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestStartContest_UnclaimedSquares(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "alice"}, {Owner: ""}},
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		StartContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestNotReady)
}

func TestStartContest_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "alice"}, {Owner: "bob"}},
	}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		StartContest(context.Background(), uuid.New(), "u")
	require.NoError(t, err)
	assert.Equal(t, model.ContestStatusQ1, got.Status)
}

func TestStartContest_GameLinked(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusActive,
		GameID: &gameID,
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		StartContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestIsGameLinked)
}

func TestRecordQuarterResult_InvalidStatus(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 7, 3, "u")
	assert.Error(t, err)
}

func TestRecordQuarterResult_DuplicateQuarter(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:         model.ContestStatusQ1,
		QuarterResults: []model.QuarterResult{{Quarter: 1}},
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 7, 3, "u")
	assert.ErrorIs(t, err, errs.ErrQuarterResultAlreadyExists)
}

func TestRecordQuarterResult_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusQ1,
		XLabels: orderedLabels(t),
		YLabels: orderedLabels(t),
		Squares: []model.Square{{Row: 3, Col: 7, Owner: "winner", OwnerName: "Win Ner"}},
	}, nil)
	repo.EXPECT().ApplyQuarterResults(mock.Anything, mock.MatchedBy(func(c *model.Contest) bool {
		return c.Status == model.ContestStatusQ2
	}), mock.MatchedBy(func(results []model.QuarterResult) bool {
		return len(results) == 1 && results[0].Quarter == 1 && results[0].Winner == "winner"
	})).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 17, 23, "u")
	require.NoError(t, err)
	assert.Equal(t, 1, got.Quarter)
	assert.Equal(t, "winner", got.Winner)
	assert.Equal(t, "u", got.CreatedBy)
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
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	repo.EXPECT().Create(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10}, "o")
	assert.Error(t, err)
}

func TestUpdateContest_SaveError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive, HomeTeam: "A"}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	homeTeam := "B"
	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{HomeTeam: &homeTeam}, "u", nil)
	assert.Error(t, err)
}

func TestStartContest_UpdateError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:  model.ContestStatusActive,
		Squares: []model.Square{{Owner: "alice"}},
	}, nil)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		StartContest(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestRecordQuarterResult_WinnerNotFound(t *testing.T) {
	short, _ := json.Marshal([]int8{0, 1, 2})
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ1, XLabels: short, YLabels: short,
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 17, 23, "u")
	assert.Error(t, err)
}

func TestRecordQuarterResult_BadYLabels(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ1, XLabels: orderedLabels(t), YLabels: []byte("not-json"),
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 17, 23, "u")
	assert.Error(t, err)
}

func TestRecordQuarterResult_ApplyError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ1, XLabels: orderedLabels(t), YLabels: orderedLabels(t),
		Squares: []model.Square{{Row: 3, Col: 7, Owner: "w"}},
	}, nil)
	repo.EXPECT().ApplyQuarterResults(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 17, 23, "u")
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

func TestRecordQuarterResult_BadLabels(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ1, XLabels: []byte("not-json"), YLabels: orderedLabels(t),
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 17, 23, "u")
	assert.Error(t, err)
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

func TestRollbackLastQuarterResult_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:         model.ContestStatusQ2,
		QuarterResults: []model.QuarterResult{{ID: uuid.New(), Quarter: 1, Winner: "winner"}},
	}, nil)
	repo.EXPECT().RollbackQuarterResult(mock.Anything, mock.Anything, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	require.NoError(t, err)
	assert.Equal(t, 1, got.Quarter)
}

func TestRollbackLastQuarterResult_FromFinished(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:         model.ContestStatusFinished,
		QuarterResults: []model.QuarterResult{{ID: uuid.New(), Quarter: 4}},
	}, nil)
	repo.EXPECT().RollbackQuarterResult(mock.Anything, mock.Anything, mock.Anything).Return(nil)

	got, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	require.NoError(t, err)
	assert.Equal(t, 4, got.Quarter)
}

func TestRollbackLastQuarterResult_NothingToRollback(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrNoQuarterResultToRollback)
}

func TestRollbackLastQuarterResult_MissingResult(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ2}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrNoQuarterResultToRollback)
}

func TestRollbackLastQuarterResult_GameLinked(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ2,
		GameID: &gameID,
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestIsGameLinked)
}

func TestRollbackLastQuarterResult_GetError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, gorm.ErrRecordNotFound)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, gorm.ErrRecordNotFound)
}

func TestRollbackLastQuarterResult_RollbackError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:         model.ContestStatusQ2,
		QuarterResults: []model.QuarterResult{{ID: uuid.New(), Quarter: 1}},
	}, nil)
	repo.EXPECT().RollbackQuarterResult(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestRecordQuarterResult_Unauthorized(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusQ1}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		RecordQuarterResult(context.Background(), uuid.New(), 7, 3, "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedContestEdit)
}

func TestRecordQuarterResult_GameLinkedSkipsAuth(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status: model.ContestStatusQ1,
		GameID: &gameID,
	}, nil)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), mocks.NewParticipantService(t)).
		RecordQuarterResult(context.Background(), uuid.New(), 7, 3, "u")
	assert.ErrorIs(t, err, errs.ErrContestIsGameLinked)
}

func TestRollbackLastQuarterResult_Unauthorized(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{
		Status:         model.ContestStatusQ2,
		QuarterResults: []model.QuarterResult{{ID: uuid.New(), Quarter: 1}},
	}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), pSvc).
		RollbackLastQuarterResult(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedContestEdit)
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
	away := "B"
	_, err := contestSvc(repo, mocks.NewParticipantRepository(t), okAuth(t)).
		UpdateContest(context.Background(), uuid.New(), &model.UpdateContestRequest{AwayTeam: &away}, "u", &current)

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
