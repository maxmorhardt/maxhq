package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/email"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/mail"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

const (
	recapBatchSize     = 200
	recapLease         = 10 * time.Minute
	recapSendTimeout   = 5 * time.Minute
	recapMaxAttempts   = 5
	recapMaxAge        = 24 * time.Hour
	recapRetention     = 30 * 24 * time.Hour
	recapPollInterval  = 30 * time.Second
	recapPruneInterval = time.Hour
)

var recapBackoff = []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute, 2 * time.Hour}

type RecapService interface {
	Schedule(ctx context.Context, contestID uuid.UUID) error
	SendDue(ctx context.Context) error
	Run(ctx context.Context)
}

type recapService struct {
	repo        repository.RecapEmailRepository
	contestRepo repository.ContestRepository
	playerRepo  repository.PlayerRepository
	mailer      mail.Client
	webURL      string
	now         func() time.Time
	wake        chan struct{}
}

func NewRecapService(repo repository.RecapEmailRepository, contestRepo repository.ContestRepository, playerRepo repository.PlayerRepository, mailer mail.Client, webURL string) RecapService {
	return &recapService{
		repo:        repo,
		contestRepo: contestRepo,
		playerRepo:  playerRepo,
		mailer:      mailer,
		webURL:      webURL,
		now:         time.Now,
		wake:        make(chan struct{}, 1),
	}
}

func (s *recapService) Schedule(ctx context.Context, contestID uuid.UUID) error {
	if s.mailer == nil {
		return nil
	}

	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		return err
	}
	emails := make([]model.RecapEmail, 0, len(players))
	for i := range players {
		if strings.Contains(players[i].UserID, "@") {
			emails = append(emails, model.RecapEmail{ContestID: contestID, UserID: players[i].UserID})
		}
	}
	if err := s.repo.CreateAll(ctx, emails); err != nil {
		return err
	}

	database.AfterCommit(ctx, s.notify)
	return nil
}

func (s *recapService) notify() {
	select {
	case s.wake <- struct{}{}:
	default:
	}
}

func (s *recapService) Run(ctx context.Context) {
	ctx = logging.NewContext(ctx, logging.FromContext(ctx).With("component", "recap-sender"))
	poll := time.NewTicker(recapPollInterval)
	defer poll.Stop()
	prune := time.NewTicker(recapPruneInterval)
	defer prune.Stop()

	s.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.wake:
			s.tick(ctx)
		case <-poll.C:
			s.tick(ctx)
		case <-prune.C:
			s.prune(ctx)
		}
	}
}

func (s *recapService) tick(ctx context.Context) {
	log := logging.FromContext(ctx)
	if err := s.SendDue(ctx); err != nil {
		log.Warn("recap send pass failed, retrying next tick", "error", err)
	}

	oldest, err := s.repo.OldestPending(ctx)
	if err != nil {
		log.Warn("failed to measure the recap email backlog", "error", err)
		return
	}
	age := 0.0
	if oldest != nil {
		age = s.now().Sub(*oldest).Seconds()
	}
	metrics.SetRecapOldestPending(age)
}

func (s *recapService) prune(ctx context.Context) {
	n, err := s.repo.PruneFinished(ctx, s.now().Add(-recapRetention))
	if err != nil {
		logging.FromContext(ctx).Warn("failed to prune old recap emails", "error", err)
		return
	}
	if n > 0 {
		logging.FromContext(ctx).Info("pruned old recap emails", "count", n)
	}
}

func (s *recapService) SendDue(ctx context.Context) error {
	if s.mailer == nil {
		return nil
	}

	now := s.now()
	expired, err := s.repo.ExpirePending(ctx, now.Add(-recapMaxAge), "not sent within 24 hours")
	if err != nil {
		return err
	}
	if expired > 0 {
		metrics.AddRecapEmails(metrics.RecapSkipped, int(expired))
		logging.FromContext(ctx).Warn("skipped recap emails that waited more than 24 hours", "count", expired)
	}

	claimed, err := s.repo.ClaimDue(ctx, now, now.Add(recapLease), recapBatchSize)
	if err != nil {
		return err
	}

	order := make([]uuid.UUID, 0)
	byContest := make(map[uuid.UUID][]model.RecapEmail)
	for i := range claimed {
		id := claimed[i].ContestID
		if _, seen := byContest[id]; !seen {
			order = append(order, id)
		}
		byContest[id] = append(byContest[id], claimed[i])
	}
	for _, id := range order {
		s.sendContest(ctx, id, byContest[id])
	}
	return nil
}

func (s *recapService) sendContest(ctx context.Context, contestID uuid.UUID, rows []model.RecapEmail) {
	log := logging.FromContext(ctx).With("contest_id", contestID)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			s.finish(ctx, rows, model.RecapEmailFailed, "the contest no longer exists", metrics.RecapFailed)
			return
		}
		log.Error("failed to load the contest for its recap emails", "error", err)
		s.retryAll(ctx, rows, err)
		return
	}
	content, err := email.RenderRecap(s.webURL, recapOf(contest))
	if err != nil {
		log.Error("failed to render the recap email", "error", err)
		s.retryAll(ctx, rows, err)
		return
	}

	msgs := make([]*mail.Message, 0, len(rows))
	for i := range rows {
		msgs = append(msgs, &mail.Message{To: rows[i].UserID, ReplyTo: email.FeedbackAddress, Subject: content.Subject, Text: content.Text, HTML: content.HTML})
	}

	sendCtx, cancel := context.WithTimeout(ctx, recapSendTimeout)
	errs := s.mailer.SendAll(sendCtx, msgs)
	cancel()

	var sent, unconfirmed, failed []model.RecapEmail
	retried := 0
	for i, sendErr := range errs {
		switch {
		case sendErr == nil:
			sent = append(sent, rows[i])
		case mail.MaybeDelivered(sendErr):
			unconfirmed = append(unconfirmed, rows[i])
		case mail.Permanent(sendErr) || rows[i].Attempts >= recapMaxAttempts:
			failed = append(failed, rows[i])
			log.Error("gave up on a recap email", "recap_email_id", rows[i].ID, "attempts", rows[i].Attempts, "error", sendErr)
		default:
			retried++
			s.retry(ctx, &rows[i], sendErr)
		}
	}
	s.finish(ctx, sent, model.RecapEmailSent, "", metrics.RecapSent)
	s.finish(ctx, unconfirmed, model.RecapEmailUnconfirmed, "the connection dropped after sending, so it was not retried", metrics.RecapUnconfirmed)
	s.finish(ctx, failed, model.RecapEmailFailed, firstError(errs), metrics.RecapFailed)

	log.Info("sent contest recap emails", "sent", len(sent), "unconfirmed", len(unconfirmed), "failed", len(failed), "retrying", retried)
}

func (s *recapService) finish(ctx context.Context, rows []model.RecapEmail, status model.RecapEmailStatus, reason, result string) {
	if len(rows) == 0 {
		return
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for i := range rows {
		ids = append(ids, rows[i].ID)
	}
	if err := s.repo.Finish(ctx, ids, status, reason, s.now()); err != nil {
		logging.FromContext(ctx).Error("failed to record recap email results", "status", status, "error", err)
		return
	}
	metrics.AddRecapEmails(result, len(rows))
}

func (s *recapService) retryAll(ctx context.Context, rows []model.RecapEmail, err error) {
	for i := range rows {
		if rows[i].Attempts >= recapMaxAttempts {
			s.finish(ctx, rows[i:i+1], model.RecapEmailFailed, err.Error(), metrics.RecapFailed)
			continue
		}
		s.retry(ctx, &rows[i], err)
	}
}

func (s *recapService) retry(ctx context.Context, row *model.RecapEmail, err error) {
	delay := recapBackoff[min(row.Attempts, len(recapBackoff))-1]
	if rerr := s.repo.Reschedule(ctx, row.ID, err.Error(), s.now().Add(delay)); rerr != nil {
		logging.FromContext(ctx).Error("failed to reschedule a recap email", "recap_email_id", row.ID, "error", rerr)
		return
	}
	metrics.AddRecapEmails(metrics.RecapRetried, 1)
}

func firstError(errs []error) string {
	for _, err := range errs {
		if err != nil {
			return err.Error()
		}
	}
	return ""
}

func recapOf(contest *model.Contest) *email.Recap {
	recap := &email.Recap{
		ContestID:   contest.ID,
		ContestName: contest.Name,
		AwayTeam:    contest.AwayTeam,
		HomeTeam:    contest.HomeTeam,
		Started:     numbersDrawn(contest),
	}

	if game := contest.Game; game != nil {
		recap.AwayAbbr, recap.HomeAbbr = game.AwayAbbr, game.HomeAbbr
		recap.AwayScore, recap.HomeScore = game.AwayScore, game.HomeScore
		recap.Canceled = game.Status == model.GameStatusCanceled
	} else if n := len(contest.QuarterResults); n > 0 {
		recap.AwayScore, recap.HomeScore = contest.QuarterResults[n-1].AwayTeamScore, contest.QuarterResults[n-1].HomeTeamScore
	}

	for i := range contest.QuarterResults {
		q := &contest.QuarterResults[i]
		recap.Quarters = append(recap.Quarters, email.RecapQuarter{
			Number:    q.Quarter,
			AwayScore: q.AwayTeamScore,
			HomeScore: q.HomeTeamScore,
			Winner:    winnerName(q),
		})
	}

	return recap
}

func winnerName(q *model.QuarterResult) string {
	switch q.Winner {
	case "":
		return ""
	case model.GhostUser:
		return email.RemovedPlayer
	default:
		return pseudonym.Public(q.WinnerName)
	}
}

func numbersDrawn(contest *model.Contest) bool {
	xLabels, _, err := util.ParseLabels(contest)
	return err == nil && len(xLabels) > 0 && xLabels[0] >= 0
}
