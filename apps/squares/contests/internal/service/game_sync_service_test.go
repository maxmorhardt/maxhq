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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func liveGame(gameID uuid.UUID, scores ...model.GameScore) *model.Game {
	return &model.Game{ID: gameID, Status: model.GameStatusInProgress, Scores: scores}
}

func finalGame(gameID uuid.UUID, scores ...model.GameScore) *model.Game {
	return &model.Game{ID: gameID, Status: model.GameStatusFinal, Scores: scores}
}

func fullContest(status model.ContestStatus, gameID uuid.UUID) *model.Contest {
	labels, _ := json.Marshal([]int8{0, 1, 2, 3, 4, 5, 6, 7, 8, 9})
	squares := make([]model.Square, 0, 100)
	for r := range 10 {
		for c := range 10 {
			squares = append(squares, model.Square{Row: r, Col: c, Owner: "u", OwnerName: "U"})
		}
	}
	return &model.Contest{ID: uuid.New(), Status: status, GameID: &gameID, XLabels: labels, YLabels: labels, Squares: squares}
}

func syncFixture(t *testing.T, game *model.Game, contest *model.Contest) (*mocks.GameProjectionRepository, *mocks.ContestRepository, *mocks.ContestService) {
	t.Helper()
	g := mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(nil)
	c := mocks.NewContestRepository(t)
	cs := mocks.NewContestService(t)

	if game.Status == model.GameStatusScheduled {
		return g, c, cs
	}

	g.EXPECT().GetByID(mock.Anything, game.ID).Return(game, nil)
	if contest == nil {
		c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return(nil, nil)
		return g, c, cs
	}

	c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return([]uuid.UUID{contest.ID}, nil)
	c.EXPECT().GetByIDForUpdate(mock.Anything, contest.ID).Return(contest, nil)
	return g, c, cs
}

func TestGameSync_ScheduledGameOnlyRefreshesProjection(t *testing.T) {
	game := &model.Game{ID: uuid.New(), Status: model.GameStatusScheduled}
	g, c, cs := syncFixture(t, game, nil)

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_AdvancesStartedContest(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	contest := fullContest(model.ContestStatusQ1, game.ID)
	g, c, cs := syncFixture(t, game, contest)
	cs.EXPECT().ApplyQuarterResult(mock.Anything, contest, 1, 7, 3).Return(&model.QuarterResult{Quarter: 1, Winner: "u"}, nil).Once()

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

type inTxKey struct{}

func TestGameSync_ReloadsGameInTheWriteTransaction(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	inTx := mock.MatchedBy(func(ctx context.Context) bool { return ctx.Value(inTxKey{}) != nil })

	tx := &mocks.Transactor{}
	tx.On("Do", mock.Anything, mock.Anything).
		Return(func(ctx context.Context, fn func(context.Context) error) error {
			return fn(context.WithValue(ctx, inTxKey{}, true))
		})

	g := mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(inTx, game).Return(nil)
	g.EXPECT().GetByID(inTx, game.ID).Return(game, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return(nil, nil)

	require.NoError(t, service.NewGameSyncService(g, c, mocks.NewContestService(t), tx, quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_AutoStartsAndBackfills(t *testing.T) {
	game := liveGame(uuid.New(),
		model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3},
		model.GameScore{Quarter: 2, HomeScore: 14, AwayScore: 10},
	)
	contest := fullContest(model.ContestStatusActive, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	cs.EXPECT().AutoStart(mock.Anything, contest).
		Run(func(_ context.Context, c *model.Contest) { c.Status = model.ContestStatusQ1 }).
		Return(nil).Once()
	quarters := make([]int, 0, 2)
	cs.EXPECT().ApplyQuarterResult(mock.Anything, contest, mock.Anything, mock.Anything, mock.Anything).
		Run(func(_ context.Context, _ *model.Contest, quarter, _, _ int) { quarters = append(quarters, quarter) }).
		Return(&model.QuarterResult{}, nil).Twice()

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
	assert.Equal(t, []int{1, 2}, quarters)
}

func TestGameSync_AutoStartFailureIsRetried(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	contest := fullContest(model.ContestStatusActive, game.ID)
	g, c, cs := syncFixture(t, game, contest)
	cs.EXPECT().AutoStart(mock.Anything, contest).Return(errs.ErrVersionConflict)

	err := service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game)

	assert.ErrorIs(t, err, errs.ErrVersionConflict, "the event is redelivered so the start is retried")
}

func TestGameSync_SkipsUnresolvableQuarter(t *testing.T) {
	game := liveGame(uuid.New(),
		model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3},
		model.GameScore{Quarter: 2, HomeScore: 14, AwayScore: 10},
	)
	contest := fullContest(model.ContestStatusQ1, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	cs.EXPECT().ApplyQuarterResult(mock.Anything, contest, 1, 7, 3).Return(nil, errs.ErrWinnerNotDeterminable).Once()
	cs.EXPECT().ApplyQuarterResult(mock.Anything, contest, 2, 14, 10).Return(&model.QuarterResult{Quarter: 2}, nil).Once()

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_StopsOnApplyErrorAndAsksForRedelivery(t *testing.T) {
	game := liveGame(uuid.New(),
		model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3},
		model.GameScore{Quarter: 2, HomeScore: 14, AwayScore: 10},
	)
	contest := fullContest(model.ContestStatusQ1, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	cs.EXPECT().ApplyQuarterResult(mock.Anything, contest, 1, 7, 3).Return(nil, errors.New("db")).Once()

	assert.Error(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_SkipsWhenGridNotFull(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	contest := fullContest(model.ContestStatusActive, game.ID)
	contest.Squares[0].Owner = ""
	g, c, cs := syncFixture(t, game, contest)

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_SkipsAlreadyAppliedQuarter(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	contest := fullContest(model.ContestStatusQ2, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_IgnoresTerminalContests(t *testing.T) {
	game := finalGame(uuid.New())
	contest := fullContest(model.ContestStatusFinished, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_FinalizesWhenGameEndsBeforeKickoffLock(t *testing.T) {
	game := finalGame(uuid.New(),
		model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3},
		model.GameScore{Quarter: 4, HomeScore: 21, AwayScore: 17},
	)
	contest := fullContest(model.ContestStatusActive, game.ID)
	contest.Squares[0].Owner = ""
	g, c, cs := syncFixture(t, game, contest)

	var scores []model.GameScore
	cs.EXPECT().FinalizeFromScores(mock.Anything, contest, mock.Anything).
		Run(func(_ context.Context, _ *model.Contest, s []model.GameScore) { scores = s }).
		Return(nil).Once()

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
	require.Len(t, scores, 2)
	assert.Equal(t, 4, scores[1].Quarter)
}

func TestGameSync_ContestDeletedMeanwhileIsSkipped(t *testing.T) {
	game := liveGame(uuid.New())
	g := mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(nil)
	g.EXPECT().GetByID(mock.Anything, game.ID).Return(game, nil)
	contestID := uuid.New()
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return([]uuid.UUID{contestID}, nil)
	c.EXPECT().GetByIDForUpdate(mock.Anything, contestID).Return(nil, gorm.ErrRecordNotFound)

	require.NoError(t, service.NewGameSyncService(g, c, mocks.NewContestService(t), passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func TestGameSync_Errors(t *testing.T) {
	game := liveGame(uuid.New())

	g := mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(errors.New("db"))
	assert.Error(t, service.NewGameSyncService(g, mocks.NewContestRepository(t), mocks.NewContestService(t), passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))

	g = mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(nil)
	g.EXPECT().GetByID(mock.Anything, game.ID).Return(nil, errors.New("db"))
	assert.Error(t, service.NewGameSyncService(g, mocks.NewContestRepository(t), mocks.NewContestService(t), passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))

	g = mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(nil)
	g.EXPECT().GetByID(mock.Anything, game.ID).Return(game, nil)
	c := mocks.NewContestRepository(t)
	c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return(nil, errors.New("db"))
	assert.Error(t, service.NewGameSyncService(g, c, mocks.NewContestService(t), passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))

	g = mocks.NewGameProjectionRepository(t)
	g.EXPECT().Upsert(mock.Anything, game).Return(nil)
	g.EXPECT().GetByID(mock.Anything, game.ID).Return(game, nil)
	c = mocks.NewContestRepository(t)
	contestID := uuid.New()
	c.EXPECT().GetIDsByGameID(mock.Anything, game.ID).Return([]uuid.UUID{contestID}, nil)
	c.EXPECT().GetByIDForUpdate(mock.Anything, contestID).Return(nil, errors.New("lock timeout"))
	assert.Error(t, service.NewGameSyncService(g, c, mocks.NewContestService(t), passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}

func quietFeed(t *testing.T) *mocks.FeedService {
	f := mocks.NewFeedService(t)
	f.EXPECT().InvalidateContest(mock.Anything, mock.Anything).Maybe()
	return f
}

func TestGameSync_LeavesDeletedContestsAlone(t *testing.T) {
	game := liveGame(uuid.New(), model.GameScore{Quarter: 1, HomeScore: 7, AwayScore: 3})
	contest := fullContest(model.ContestStatusDeleted, game.ID)
	g, c, cs := syncFixture(t, game, contest)

	require.NoError(t, service.NewGameSyncService(g, c, cs, passTx(), quietFeed(t)).ApplyGameUpdate(context.Background(), game))
}
