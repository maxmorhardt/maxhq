package service_test

import (
	"context"
	"errors"
	"fmt"
	"net/textproto"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/email"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/mail"
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

func recapSvc(contestRepo *mocks.ContestRepository, playerRepo *mocks.PlayerRepository, mailer mail.Client) service.RecapService {
	return service.NewRecapService(contestRepo, playerRepo, mailer, "https://squares.example.com", 0)
}

func recipients(msgs []*mail.Message) []string {
	to := make([]string, 0, len(msgs))
	for _, m := range msgs {
		to = append(to, m.To)
	}
	return to
}

func TestRecapService_SendsTheSameRecapToEveryPlayerInOneBatch(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com", "jen@example.com", model.GhostUser)

	var batch []*mail.Message
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).
		Return([]error{nil, nil}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.Equal(t, []string{"max@example.com", "jen@example.com"}, recipients(batch))
	assert.Equal(t, batch[0].HTML, batch[1].HTML)
	assert.Equal(t, email.FeedbackAddress, batch[0].ReplyTo)
	assert.Equal(t, "Squares: Office Pool final results", batch[0].Subject)
	for _, want := range []string{"Max M.", "Removed player", "Open square", "Jen K.", ">BUF<", ">24<", ">27<", ">17<", "/contests/create"} {
		assert.Contains(t, batch[0].HTML, want)
	}
	assert.NotContains(t, batch[0].HTML, "max@example.com")
}

func TestRecapService_RetriesOnlyWhatIsSafeToRetry(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "ok@example.com", "maybe@example.com", "gone@example.com", "busy@example.com")

	var retried []*mail.Message
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Return([]error{nil, fmt.Errorf("%w: reset", mail.ErrMaybeDelivered), &textproto.Error{Code: 550, Msg: "no such mailbox"}, errors.New("timeout")}).Once()
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { retried = msgs }).
		Return([]error{nil}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	assert.Equal(t, []string{"busy@example.com"}, recipients(retried))
}

func TestRecapService_DoesNotRetryARejectedLogin(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "a@example.com", "b@example.com")

	rejected := fmt.Errorf("%w: auth: %w", mail.ErrSession, &textproto.Error{Code: 535, Msg: "bad credentials"})
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Return([]error{rejected, rejected}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)
}

func TestRecapService_RetriesABusyServerAndNotAMissingTLS(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "a@example.com", "b@example.com")

	busy := fmt.Errorf("%w: ehlo: %w", mail.ErrSession, &textproto.Error{Code: 421, Msg: "busy"})
	noTLS := fmt.Errorf("%w: %w", mail.ErrSession, mail.ErrNoTLS)
	var retried []*mail.Message
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Return([]error{busy, noTLS}).Once()
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { retried = msgs }).
		Return([]error{nil}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	assert.Equal(t, []string{"a@example.com"}, recipients(retried))
}

func TestRecapService_GivesUpAfterTheLastAttempt(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "busy@example.com")

	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Return([]error{errors.New("timeout")}).Times(3)

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)
}

func TestRecapService_StopsRetryingWhenTimeRunsOut(t *testing.T) {
	contest := finishedContest(t)
	contestRepo, playerRepo := recapRepos(t, contest, "busy@example.com")
	ctx, cancel := context.WithCancel(context.Background())

	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(context.Context, []*mail.Message) { cancel() }).
		Return([]error{errors.New("timeout")}).Once()

	service.NewRecapService(contestRepo, playerRepo, mailer, "https://squares.example.com", time.Hour).Send(ctx, contest.ID)
}

func TestRecapService_CanceledBeforeNumbersHasNoTable(t *testing.T) {
	contest := finishedContest(t)
	unlocked := []byte(`[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]`)
	contest.XLabels, contest.YLabels, contest.QuarterResults = unlocked, unlocked, nil
	contest.Game.Status = model.GameStatusCanceled
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")

	var batch []*mail.Message
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).Return([]error{nil}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.Len(t, batch, 1)
	assert.Equal(t, "Squares: Office Pool game canceled", batch[0].Subject)
	assert.Contains(t, batch[0].Text, "This board has no winners.")
	assert.NotContains(t, batch[0].Text, "Winner")
}

func TestRecapService_WithoutAGameUsesTheLastQuarter(t *testing.T) {
	contest := finishedContest(t)
	contest.Game = nil
	contestRepo, playerRepo := recapRepos(t, contest, "max@example.com")

	var batch []*mail.Message
	mailer := mocks.NewClient(t)
	mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).Return([]error{nil}).Once()

	recapSvc(contestRepo, playerRepo, mailer).Send(context.Background(), contest.ID)

	require.Len(t, batch, 1)
	assert.Contains(t, batch[0].Text, "Buffalo Bills 24, Kansas City Chiefs 27.")
}

func TestRecapService_LoadFailuresSendNothing(t *testing.T) {
	contest := finishedContest(t)

	contestRepo := mocks.NewContestRepository(t)
	contestRepo.EXPECT().GetByID(mock.Anything, contest.ID).Return(nil, errors.New("db"))
	recapSvc(contestRepo, mocks.NewPlayerRepository(t), mocks.NewClient(t)).Send(context.Background(), contest.ID)

	contestRepo = mocks.NewContestRepository(t)
	contestRepo.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	playerRepo := mocks.NewPlayerRepository(t)
	playerRepo.EXPECT().GetAllByContestID(mock.Anything, contest.ID).Return(nil, errors.New("db"))
	recapSvc(contestRepo, playerRepo, mocks.NewClient(t)).Send(context.Background(), contest.ID)
}

func TestRecapService_DisabledWithoutAMailer(t *testing.T) {
	recapSvc(mocks.NewContestRepository(t), mocks.NewPlayerRepository(t), nil).Send(context.Background(), uuid.New())
}
