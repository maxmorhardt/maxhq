package service_test

import (
	"context"
	"errors"
	"fmt"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/email"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/service"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
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

type recapDeps struct {
	repo     *mocks.RecapEmailRepository
	contests *mocks.ContestRepository
	players  *mocks.PlayerRepository
	mailer   *mocks.Client
}

func newRecapDeps(t *testing.T) *recapDeps {
	return &recapDeps{
		repo:     mocks.NewRecapEmailRepository(t),
		contests: mocks.NewContestRepository(t),
		players:  mocks.NewPlayerRepository(t),
		mailer:   mocks.NewClient(t),
	}
}

func (d *recapDeps) service() service.RecapService {
	return service.NewRecapService(d.repo, d.contests, d.players, d.mailer, "https://squares.example.com")
}

func (d *recapDeps) claim(rows ...model.RecapEmail) {
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(rows, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Once()
}

func row(contestID uuid.UUID, to string, attempts int) model.RecapEmail {
	return model.RecapEmail{ID: uuid.New(), ContestID: contestID, UserID: to, Attempts: attempts}
}

func TestRecapService_ScheduleQueuesEveryPlayerWithAnEmail(t *testing.T) {
	d := newRecapDeps(t)
	contestID := uuid.New()
	d.players.EXPECT().GetAllByContestID(mock.Anything, contestID).Return([]model.ContestPlayer{
		{UserID: "max@example.com"}, {UserID: model.GhostUser}, {UserID: "jen@example.com"},
	}, nil)
	var queued []model.RecapEmail
	d.repo.EXPECT().CreateAll(mock.Anything, mock.Anything).Run(func(_ context.Context, rows []model.RecapEmail) { queued = rows }).Return(nil)

	require.NoError(t, d.service().Schedule(context.Background(), contestID))

	require.Len(t, queued, 2)
	assert.Equal(t, "max@example.com", queued[0].UserID)
	assert.Equal(t, contestID, queued[1].ContestID)
}

func TestRecapService_ScheduleErrors(t *testing.T) {
	d := newRecapDeps(t)
	d.players.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, errors.New("db")).Once()
	require.Error(t, d.service().Schedule(context.Background(), uuid.New()))

	d.players.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return([]model.ContestPlayer{{UserID: "a@example.com"}}, nil).Once()
	d.repo.EXPECT().CreateAll(mock.Anything, mock.Anything).Return(errors.New("db"))
	require.Error(t, d.service().Schedule(context.Background(), uuid.New()))
}

func TestRecapService_DisabledWithoutAMailer(t *testing.T) {
	svc := service.NewRecapService(mocks.NewRecapEmailRepository(t), mocks.NewContestRepository(t), mocks.NewPlayerRepository(t), nil, "https://squares.example.com")

	require.NoError(t, svc.Schedule(context.Background(), uuid.New()))
	require.NoError(t, svc.SendDue(context.Background()))
	svc.Run(context.Background())
}

func TestRecapService_SendsEachContestOverOneBatchAndRecordsEveryOutcome(t *testing.T) {
	d := newRecapDeps(t)
	contest := finishedContest(t)
	sent, unconfirmed := row(contest.ID, "max@example.com", 1), row(contest.ID, "jen@example.com", 1)
	gone, busy := row(contest.ID, "gone@example.com", 1), row(contest.ID, "busy@example.com", 2)
	d.claim(sent, unconfirmed, gone, busy)
	d.contests.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)

	var batch []*mail.Message
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).
		Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).
		Return([]error{nil, fmt.Errorf("%w: reset", mail.ErrMaybeDelivered), &textproto.Error{Code: 550, Msg: "no such mailbox"}, errors.New("timeout")})
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{sent.ID}, model.RecapEmailSent, "", mock.Anything).Return(nil)
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{unconfirmed.ID}, model.RecapEmailUnconfirmed, mock.Anything, mock.Anything).Return(nil)
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{gone.ID}, model.RecapEmailFailed, mock.MatchedBy(func(reason string) bool { return strings.Contains(reason, "550") }), mock.Anything).Return(nil)
	d.repo.EXPECT().Reschedule(mock.Anything, busy.ID, "timeout", mock.MatchedBy(func(next time.Time) bool {
		return next.After(time.Now().Add(4 * time.Minute))
	})).Return(nil)

	require.NoError(t, d.service().SendDue(context.Background()))

	require.Len(t, batch, 4)
	assert.Equal(t, "max@example.com", batch[0].To)
	assert.Equal(t, email.FeedbackAddress, batch[0].ReplyTo)
	assert.Equal(t, "Squares: Office Pool final results", batch[0].Subject)
	assert.Equal(t, batch[0].HTML, batch[3].HTML)
	for _, want := range []string{"Max M.", "Removed player", "Open square", "Jen K.", ">BUF<", "/contests/create"} {
		assert.Contains(t, batch[0].HTML, want)
	}
	assert.NotContains(t, batch[0].HTML, "max@example.com")
}

func TestRecapService_GivesUpAfterTheLastAttempt(t *testing.T) {
	d := newRecapDeps(t)
	contest := finishedContest(t)
	last := row(contest.ID, "max@example.com", 5)
	d.claim(last)
	d.contests.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Return([]error{errors.New("timeout")})
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{last.ID}, model.RecapEmailFailed, "timeout", mock.Anything).Return(nil)

	require.NoError(t, d.service().SendDue(context.Background()))
}

func TestRecapService_DeletedContestFailsItsEmails(t *testing.T) {
	d := newRecapDeps(t)
	r := row(uuid.New(), "max@example.com", 1)
	d.claim(r)
	d.contests.EXPECT().GetByID(mock.Anything, r.ContestID).Return(nil, database.ErrNotFound)
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{r.ID}, model.RecapEmailFailed, "the contest no longer exists", mock.Anything).Return(nil)

	require.NoError(t, d.service().SendDue(context.Background()))
}

func TestRecapService_LoadFailureRetriesOrGivesUp(t *testing.T) {
	d := newRecapDeps(t)
	contestID := uuid.New()
	early, last := row(contestID, "a@example.com", 1), row(contestID, "b@example.com", 5)
	d.claim(early, last)
	d.contests.EXPECT().GetByID(mock.Anything, contestID).Return(nil, errors.New("db down"))
	d.repo.EXPECT().Reschedule(mock.Anything, early.ID, "db down", mock.Anything).Return(errors.New("still down"))
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{last.ID}, model.RecapEmailFailed, "db down", mock.Anything).Return(errors.New("still down"))

	require.NoError(t, d.service().SendDue(context.Background()))
}

func TestRecapService_CanceledBeforeNumbersHasNoTable(t *testing.T) {
	d := newRecapDeps(t)
	contest := finishedContest(t)
	contest.XLabels, contest.YLabels, contest.QuarterResults = []byte(`[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]`), []byte(`[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]`), nil
	contest.Game.Status = model.GameStatusCanceled
	r := row(contest.ID, "max@example.com", 1)
	d.claim(r)
	d.contests.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	var batch []*mail.Message
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).Return([]error{nil})
	d.repo.EXPECT().Finish(mock.Anything, mock.Anything, model.RecapEmailSent, "", mock.Anything).Return(nil)

	require.NoError(t, d.service().SendDue(context.Background()))

	require.Len(t, batch, 1)
	assert.Equal(t, "Squares: Office Pool game canceled", batch[0].Subject)
	assert.Contains(t, batch[0].Text, "This board has no winners.")
	assert.NotContains(t, batch[0].Text, "Winner")
}

func TestRecapService_WithoutAGameUsesTheLastQuarter(t *testing.T) {
	d := newRecapDeps(t)
	contest := finishedContest(t)
	contest.Game = nil
	r := row(contest.ID, "max@example.com", 1)
	d.claim(r)
	d.contests.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	var batch []*mail.Message
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Run(func(_ context.Context, msgs []*mail.Message) { batch = msgs }).Return([]error{nil})
	d.repo.EXPECT().Finish(mock.Anything, mock.Anything, model.RecapEmailSent, "", mock.Anything).Return(nil)

	require.NoError(t, d.service().SendDue(context.Background()))

	assert.Contains(t, batch[0].Text, "Buffalo Bills 24, Kansas City Chiefs 27.")
}

func TestRecapService_SendDueSkipsStaleEmailsAndSurfacesClaimErrors(t *testing.T) {
	d := newRecapDeps(t)
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(3, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db")).Once()
	require.Error(t, d.service().SendDue(context.Background()))

	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, errors.New("db")).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Once()
	require.NoError(t, d.service().SendDue(context.Background()), "a failed expiry does not stop the send pass")
}

func TestRecapService_SendsContestsOneAtATime(t *testing.T) {
	d := newRecapDeps(t)
	first, second := finishedContest(t), finishedContest(t)
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return([]model.RecapEmail{row(first.ID, "a@example.com", 1)}, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return([]model.RecapEmail{row(second.ID, "b@example.com", 1)}, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Once()
	d.contests.EXPECT().GetByID(mock.Anything, first.ID).Return(first, nil)
	d.contests.EXPECT().GetByID(mock.Anything, second.ID).Return(second, nil)
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Return([]error{nil}).Twice()
	d.repo.EXPECT().Finish(mock.Anything, mock.Anything, model.RecapEmailSent, "", mock.Anything).Return(nil).Twice()

	require.NoError(t, d.service().SendDue(context.Background()))
}

func TestRecapService_SendDueStopsWhenCanceled(t *testing.T) {
	d := newRecapDeps(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, nil).Once()

	require.ErrorIs(t, d.service().SendDue(ctx), context.Canceled)
}

func TestRecapService_ResultsAreRecordedEvenWhenShuttingDown(t *testing.T) {
	d := newRecapDeps(t)
	contest := finishedContest(t)
	r := row(contest.ID, "max@example.com", 1)
	ctx, cancel := context.WithCancel(context.Background())
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, nil).Once()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return([]model.RecapEmail{r}, nil).Once()
	d.contests.EXPECT().GetByID(mock.Anything, contest.ID).Return(contest, nil)
	d.mailer.EXPECT().SendAll(mock.Anything, mock.Anything).Run(func(context.Context, []*mail.Message) { cancel() }).Return([]error{nil})
	d.repo.EXPECT().Finish(mock.Anything, []uuid.UUID{r.ID}, model.RecapEmailSent, "", mock.Anything).
		Run(func(ctx context.Context, _ []uuid.UUID, _ model.RecapEmailStatus, _ string, _ time.Time) {
			assert.NoError(t, ctx.Err(), "results are recorded on a context the shutdown does not cancel")
		}).Return(nil)

	require.ErrorIs(t, d.service().SendDue(ctx), context.Canceled)
}

func TestRecapService_RunSendsUntilCanceled(t *testing.T) {
	d := newRecapDeps(t)
	ticked := make(chan struct{}, 4)
	d.repo.EXPECT().ExpirePending(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(0, nil).Maybe()
	d.repo.EXPECT().ClaimNextContest(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Maybe()
	oldest := time.Now().Add(-time.Minute)
	d.repo.EXPECT().OldestPending(mock.Anything).Run(func(context.Context) { ticked <- struct{}{} }).Return(&oldest, nil).Once()
	d.repo.EXPECT().OldestPending(mock.Anything).Run(func(context.Context) { ticked <- struct{}{} }).Return(nil, errors.New("db")).Maybe()
	d.players.EXPECT().GetAllByContestID(mock.Anything, mock.Anything).Return(nil, nil).Maybe()
	d.repo.EXPECT().CreateAll(mock.Anything, mock.Anything).Return(nil).Maybe()

	svc := d.service()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		svc.Run(ctx)
		close(done)
	}()

	<-ticked
	require.NoError(t, svc.Schedule(context.Background(), uuid.New()))
	select {
	case <-ticked:
	case <-time.After(5 * time.Second):
		t.Fatal("scheduling did not wake the sender")
	}
	cancel()
	<-done
}
