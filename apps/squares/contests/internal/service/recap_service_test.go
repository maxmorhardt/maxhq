package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/textproto"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/email"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func finishedContest(t *testing.T) *model.Contest {
	return &model.Contest{
		ID:       uuid.New(),
		Name:     "Office Pool",
		AwayTeam: "Buffalo Bills",
		HomeTeam: "Kansas City Chiefs",
		Status:   model.ContestStatusFinished,
		XLabels:  orderedLabels(t),
		YLabels:  orderedLabels(t),
		Game: &model.Game{
			AwayAbbr: "BUF", HomeAbbr: "KC", AwayScore: 24, HomeScore: 27, Status: model.GameStatusFinal,
		},
		QuarterResults: []model.QuarterResult{
			{Quarter: 1, AwayTeamScore: 7, HomeTeamScore: 3, Winner: "max@example.com", WinnerName: "Max Morhardt"},
			{Quarter: 2, AwayTeamScore: 14, HomeTeamScore: 10, Winner: model.GhostUser},
			{Quarter: 3, AwayTeamScore: 17, HomeTeamScore: 20},
			{Quarter: 4, AwayTeamScore: 24, HomeTeamScore: 27, Winner: "jen@example.com", WinnerName: "Jen Kim"},
		},
	}
}

func recapRepos(t *testing.T, contest *model.Contest, players ...string) (*mocks.ContestRepository, *mocks.PlayerRepository) {
	contestRepo := mocks.NewContestRepository(t)
	contestRepo.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	playerRepo := mocks.NewPlayerRepository(t)
	rows := make([]model.ContestPlayer, 0, len(players))
	for _, p := range players {
		rows = append(rows, model.ContestPlayer{ID: uuid.New(), ContestID: contest.ID, UserID: p})
	}
	playerRepo.EXPECT().GetAllByContestID(mock.Anything, contest.ID).Return(rows, nil)
	return contestRepo, playerRepo
}

func recapSvc(contestRepo *mocks.ContestRepository, playerRepo *mocks.PlayerRepository, mailer email.Mailer) service.RecapService {
	return service.NewRecapService(contestRepo, playerRepo, mailer, "https://squares.example.com", 0)
}

func TestRecapService_SendsTheSameRecapToEveryPlayer(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com", "jen@example.com", model.GhostUser)

	var sent []*email.Message
	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msg *email.Message) { sent = append(sent, msg) }).
		Return(nil).Twice()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.Len(t, sent, 2)
	assert.Equal(t, "max@example.com", sent[0].To)
	assert.Equal(t, "jen@example.com", sent[1].To)
	assert.Equal(t, sent[0].HTML, sent[1].HTML)
	assert.Equal(t, "Office Pool: final results", sent[0].Subject)
	for _, want := range []string{"Max M.", "Removed player", "Open square", "Jen K.", "BUF 24 – 27 KC", "/contests/create"} {
		assert.Contains(t, sent[0].HTML, want)
	}
	assert.NotContains(t, sent[0].HTML, "max@example.com")
}

func TestRecapService_CanceledBeforeKickoff(t *testing.T) {
	unlocked, err := json.Marshal([]int8{-1, -1, -1, -1, -1, -1, -1, -1, -1, -1})
	require.NoError(t, err)
	contest := finishedContest(t)
	contest.XLabels, contest.YLabels, contest.QuarterResults = unlocked, unlocked, nil
	contest.Game.Status = model.GameStatusCanceled
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")

	var msg *email.Message
	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.Anything).
		Run(func(_ context.Context, m *email.Message) { msg = m }).Return(nil).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.NotNil(t, msg)
	assert.Equal(t, "Office Pool: game canceled", msg.Subject)
	assert.Contains(t, msg.Text, "closed without drawing numbers")
	assert.NotContains(t, msg.Text, "Winning squares")
}

func TestRecapService_WithoutAGameUsesTheLastQuarter(t *testing.T) {
	contest := finishedContest(t)
	contest.Game = nil
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")

	var msg *email.Message
	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.Anything).
		Run(func(_ context.Context, m *email.Message) { msg = m }).Return(nil).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.NotNil(t, msg)
	assert.Contains(t, msg.Text, "Final: Buffalo Bills 24, Kansas City Chiefs 27")
}

func TestRecapService_RetriesTransientFailures(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")

	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.Anything).Return(errors.New("connection reset")).Twice()
	mailer.EXPECT().Send(mock.Anything, mock.Anything).Return(nil).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)
}

func TestRecapService_GivesUpOnPermanentFailures(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "bad@example.com", "max@example.com")

	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.MatchedBy(func(m *email.Message) bool { return m.To == "bad@example.com" })).
		Return(&textproto.Error{Code: 550, Msg: "mailbox unavailable"}).Once()
	mailer.EXPECT().Send(mock.Anything, mock.MatchedBy(func(m *email.Message) bool { return m.To == "max@example.com" })).
		Return(nil).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)
}

func TestRecapService_StopsRetryingWhenCanceled(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")
	ctx, cancel := context.WithCancel(context.Background())

	mailer := mocks.NewMailer(t)
	mailer.EXPECT().Send(mock.Anything, mock.Anything).
		Run(func(context.Context, *email.Message) { cancel() }).
		Return(errors.New("timeout")).Once()

	service.NewRecapService(contestRepo, playerRepo, mailer, "https://squares.example.com", time.Hour).Send(ctx, contest.ID)
}

func TestRecapService_LoadFailuresSendNothing(t *testing.T) {
	contest := finishedContest(t)

	contestRepo := mocks.NewContestRepository(t)
	contestRepo.EXPECT().GetByID(mock.Anything, contest.ID).Return(nil, errors.New("db"))
	recapSvc(contestRepo, mocks.NewPlayerRepository(t), mocks.NewMailer(t)).Send(context.Background(), contest.ID)

	contestRepo = mocks.NewContestRepository(t)
	contestRepo.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	playerRepo := mocks.NewPlayerRepository(t)
	playerRepo.EXPECT().GetAllByContestID(mock.Anything, contest.ID).Return(nil, errors.New("db"))
	recapSvc(contestRepo, playerRepo, mocks.NewMailer(t)).Send(context.Background(), contest.ID)
}

func TestRecapService_DisabledWithoutAMailer(t *testing.T) {
	recapSvc(mocks.NewContestRepository(t), mocks.NewPlayerRepository(t), nil).Send(context.Background(), uuid.New())
}
