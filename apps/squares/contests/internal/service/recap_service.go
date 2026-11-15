package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/textproto"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/email"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/mail"
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

const (
	recapLoadTimeout = 30 * time.Second
	recapSendTimeout = 5 * time.Minute
	recapAttempts    = 3
	recapConcurrency = 2
)

type RecapService interface {
	Send(ctx context.Context, contestID uuid.UUID)
}

type recapService struct {
	contestRepo repository.ContestRepository
	playerRepo  repository.PlayerRepository
	mailer      mail.Client
	webURL      string
	retryDelay  time.Duration
	slots       chan struct{}
}

func NewRecapService(contestRepo repository.ContestRepository, playerRepo repository.PlayerRepository, mailer mail.Client, webURL string, retryDelay time.Duration) RecapService {
	return &recapService{
		contestRepo: contestRepo,
		playerRepo:  playerRepo,
		mailer:      mailer,
		webURL:      webURL,
		retryDelay:  retryDelay,
		slots:       make(chan struct{}, recapConcurrency),
	}
}

func (s *recapService) Send(ctx context.Context, contestID uuid.UUID) {
	if s.mailer == nil {
		return
	}

	s.slots <- struct{}{}
	defer func() { <-s.slots }()

	log := logging.FromContext(ctx).With("contest_id", contestID)

	players, content, err := s.prepare(ctx, contestID)
	if err != nil {
		metrics.AddRecapEmails(metrics.RecapAborted, 1)
		log.Error("failed to prepare the recap email", "error", err)
		return
	}

	pending := make([]*mail.Message, 0, len(players))
	for i := range players {
		if strings.Contains(players[i].UserID, "@") {
			pending = append(pending, &mail.Message{To: players[i].UserID, ReplyTo: email.FeedbackAddress, Subject: content.Subject, Text: content.Text, HTML: content.HTML})
		}
	}

	sent, unconfirmed, failed := 0, 0, 0
	for attempt := 1; len(pending) > 0; attempt++ {
		if attempt > 1 && !wait(ctx, s.retryDelay*time.Duration(attempt-1)) {
			failed += len(pending)
			metrics.AddRecapEmails(metrics.RecapFailed, len(pending))
			log.Error("stopped retrying the recap emails", "unsent", len(pending), "error", ctx.Err())
			break
		}
		pending = s.sendRound(ctx, log, attempt, pending, &sent, &unconfirmed, &failed)
	}

	log.Info("sent contest recap emails", "sent", sent, "unconfirmed", unconfirmed, "failed", failed)
}

func (s *recapService) sendRound(ctx context.Context, log *slog.Logger, attempt int, pending []*mail.Message, sent, unconfirmed, failed *int) []*mail.Message {
	roundCtx, cancel := context.WithTimeout(ctx, recapSendTimeout)
	errs := s.mailer.SendAll(roundCtx, pending)
	cancel()

	retry := make([]*mail.Message, 0, len(pending))
	roundSent, roundUnconfirmed, roundFailed := 0, 0, 0
	var lastErr error
	for i, sendErr := range errs {
		switch {
		case sendErr == nil:
			roundSent++
		case mail.MaybeDelivered(sendErr):
			roundUnconfirmed++
		case worthRetrying(sendErr) && attempt < recapAttempts:
			retry = append(retry, pending[i])
		default:
			roundFailed++
			lastErr = sendErr
		}
	}

	metrics.AddRecapEmails(metrics.RecapSent, roundSent)
	metrics.AddRecapEmails(metrics.RecapUnconfirmed, roundUnconfirmed)
	metrics.AddRecapEmails(metrics.RecapFailed, roundFailed)
	*sent, *unconfirmed, *failed = *sent+roundSent, *unconfirmed+roundUnconfirmed, *failed+roundFailed
	if roundFailed > 0 {
		log.Error("failed to send recap emails", "count", roundFailed, "attempt", attempt, "error", lastErr)
	}
	if roundUnconfirmed > 0 {
		log.Warn("recap emails may not have arrived", "count", roundUnconfirmed, "attempt", attempt)
	}
	return retry
}

func worthRetrying(err error) bool {
	if !mail.Retryable(err) || errors.Is(err, mail.ErrNoTLS) {
		return false
	}
	var reply *textproto.Error
	return !errors.As(err, &reply) || reply.Code < 500
}

func wait(ctx context.Context, d time.Duration) bool {
	select {
	case <-ctx.Done():
		return false
	case <-time.After(d):
		return true
	}
}

func (s *recapService) prepare(ctx context.Context, contestID uuid.UUID) ([]model.ContestPlayer, *email.Content, error) {
	ctx, cancel := context.WithTimeout(ctx, recapLoadTimeout)
	defer cancel()

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		return nil, nil, fmt.Errorf("load contest: %w", err)
	}
	players, err := s.playerRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		return nil, nil, fmt.Errorf("load players: %w", err)
	}
	content, err := email.RenderRecap(s.webURL, recapOf(contest))
	if err != nil {
		return nil, nil, err
	}
	return players, content, nil
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
