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
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func contestSvc(repo *mocks.ContestRepository, pSvc *mocks.ParticipantService) service.ContestService {
	return service.NewContestService(repo, &mocks.GameSyncRepository{}, passTx(), anyEvents(), pSvc)
}

func passTx() *mocks.Transactor {
	m := &mocks.Transactor{}
	m.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error { return fn(ctx) }).Maybe()
	return m
}

func anyEvents() *mocks.ContestEventPublisher {
	m := &mocks.ContestEventPublisher{}
	for _, method := range []string{"PublishSquareUpdate", "PublishContestUpdate", "PublishQuarterResult", "PublishContestDeleted", "PublishParticipantRemoved", "PublishParticipantUpdated"} {
		m.On(method, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	}
	m.On("PublishContestDeleted", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	m.On("PublishParticipantJoined", mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	return m
}

func anyUser() *mocks.UserRepository {
	m := &mocks.UserRepository{}
	m.On("GetOrCreate", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return(&model.User{Email: "u", DefaultInitials: "AB"}, nil).Maybe()
	return m
}

func contestSvcWithGame(repo *mocks.ContestRepository, gameRepo *mocks.GameSyncRepository, pSvc *mocks.ParticipantService) service.ContestService {
	return service.NewContestService(repo, gameRepo, passTx(), anyEvents(), pSvc)
}

func okAuth(t *testing.T) *mocks.ParticipantService {
	m := mocks.NewParticipantService(t)
	m.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil).Maybe()
	return m
}

func TestCreateContest_AlreadyExists(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(true, nil)

	_, err := contestSvc(repo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n"}, "o")
	assert.ErrorIs(t, err, errs.ErrContestAlreadyExists)
}

func TestCreateContest_ExistsCheckError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, errors.New("db"))

	_, err := contestSvc(repo, mocks.NewParticipantService(t)).
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
	gameRepo := mocks.NewGameSyncRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID, HomeTeam: "Chiefs", AwayTeam: "Eagles"}, nil)

	got, err := contestSvcWithGame(repo, gameRepo, mocks.NewParticipantService(t)).
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

	_, err := contestSvc(repo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", GameID: "nope"}, "o")
	assert.ErrorIs(t, err, errs.ErrGameNotFound)
}

func TestCreateContest_GameLookupError(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	gameRepo := mocks.NewGameSyncRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(nil, errors.New("db"))

	_, err := contestSvcWithGame(repo, gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", GameID: gameID.String()}, "o")
	assert.ErrorIs(t, err, errs.ErrDatabaseUnavailable)
}

func TestCreateContest_GameNotFound(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	gameRepo := mocks.NewGameSyncRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(nil, database.ErrNotFound)

	_, err := contestSvcWithGame(repo, gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10, GameID: gameID.String()}, "o")
	assert.ErrorIs(t, err, errs.ErrGameNotFound)
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

	err := contestSvc(repo, mocks.NewParticipantService(t)).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestFinalized)
}

func TestDeleteContest_NotFound(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(nil, database.ErrNotFound)

	err := contestSvc(repo, mocks.NewParticipantService(t)).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrContestNotFound)
}

func TestDeleteContest_Unauthorized(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(errs.ErrInsufficientRole)

	err := contestSvc(repo, pSvc).
		DeleteContest(context.Background(), uuid.New(), "u")
	assert.ErrorIs(t, err, errs.ErrUnauthorizedContestDelete)
}

func TestDeleteContest_Success(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	repo.EXPECT().Delete(mock.Anything, mock.Anything).Return(nil)
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	err := contestSvc(repo, pSvc).
		DeleteContest(context.Background(), uuid.New(), "u")
	require.NoError(t, err)
}

func TestCreateContest_RepoError(t *testing.T) {
	gameID := uuid.New()
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().ExistsByOwnerAndName(mock.Anything, mock.Anything, mock.Anything).Return(false, nil)
	repo.EXPECT().Create(mock.Anything, mock.Anything, mock.Anything).Return(errors.New("db"))
	gameRepo := mocks.NewGameSyncRepository(t)
	gameRepo.EXPECT().GetByID(mock.Anything, gameID).Return(&model.Game{ID: gameID}, nil)

	_, err := contestSvcWithGame(repo, gameRepo, mocks.NewParticipantService(t)).
		CreateContest(context.Background(), &model.CreateContestRequest{Owner: "o", Name: "n", MaxSquares: 10, GameID: gameID.String()}, "o")
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

	got, err := contestSvc(repo, mocks.NewParticipantService(t)).
		ApplyQuarterResult(context.Background(), contest, 1, 17, 23)

	require.NoError(t, err)
	assert.Equal(t, "winner", got.Winner)
	assert.Equal(t, "system", got.CreatedBy)
	assert.Equal(t, model.ContestStatusQ2, contest.Status)
}

func TestApplyQuarterResult_InvalidQuarter(t *testing.T) {
	repo := mocks.NewContestRepository(t)

	_, err := contestSvc(repo, mocks.NewParticipantService(t)).
		ApplyQuarterResult(context.Background(), &model.Contest{ID: uuid.New()}, 5, 17, 23)

	assert.ErrorIs(t, err, errs.ErrInvalidQuarter)
}

func TestApplyQuarterResult_WinnerNotDeterminable(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	unlocked, err := json.Marshal([]int8{-1, -1, -1, -1, -1, -1, -1, -1, -1, -1})
	require.NoError(t, err)

	_, err = contestSvc(repo, mocks.NewParticipantService(t)).
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

	err := contestSvc(repo, mocks.NewParticipantService(t)).
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

	err := contestSvc(repo, mocks.NewParticipantService(t)).
		FinalizeFromScores(context.Background(), &model.Contest{ID: uuid.New()}, nil)

	assert.Error(t, err)
}

func TestDeleteContest_RepoError(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().GetByIDForUpdate(mock.Anything, mock.Anything).Return(&model.Contest{Status: model.ContestStatusActive}, nil)
	repo.EXPECT().Delete(mock.Anything, mock.Anything).Return(errors.New("db"))
	pSvc := mocks.NewParticipantService(t)
	pSvc.EXPECT().Authorize(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

	err := contestSvc(repo, pSvc).DeleteContest(context.Background(), uuid.New(), "u")
	assert.Error(t, err)
}

func TestAutoStart(t *testing.T) {
	contest := &model.Contest{ID: uuid.New(), Status: model.ContestStatusActive}
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().Update(mock.Anything, contest).Return(nil)

	err := contestSvc(repo, mocks.NewParticipantService(t)).AutoStart(context.Background(), contest)

	require.NoError(t, err)
	assert.Equal(t, model.ContestStatusQ1, contest.Status)
	assert.Equal(t, "system", contest.UpdatedBy)
}

func TestAutoStart_UpdateFails(t *testing.T) {
	repo := mocks.NewContestRepository(t)
	repo.EXPECT().Update(mock.Anything, mock.Anything).Return(errs.ErrVersionConflict)

	err := contestSvc(repo, mocks.NewParticipantService(t)).
		AutoStart(context.Background(), &model.Contest{ID: uuid.New(), Status: model.ContestStatusActive})

	assert.ErrorIs(t, err, errs.ErrVersionConflict)
}
