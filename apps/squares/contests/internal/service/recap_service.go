package service

import (
	"context"
	"fmt"
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

	ctx, cancel := context.WithTimeout(ctx, recapSendTimeout)
	defer cancel()

	sent, unconfirmed, failed := 0, 0, 0
	for attempt := 1; len(pending) > 0; attempt++ {
		if attempt > 1 && !wait(ctx, s.retryDelay*time.Duration(attempt-1)) {
			failed += len(pending)
			log.Error("ran out of time to retry the recap emails", "unsent", len(pending), "error", ctx.Err())
			break
		}

		errs := s.mailer.SendAll(ctx, pending)
		retry := make([]*mail.Message, 0)
		for i, sendErr := range errs {
			switch {
			case sendErr == nil:
				sent++
			case mail.MaybeDelivered(sendErr):
				unconfirmed++
			case mail.Retryable(sendErr) && attempt < recapAttempts:
				retry = append(retry, pending[i])
			default:
				failed++
				log.Error("failed to send a recap email", "attempt", attempt, "error", sendErr)
			}
		}
		pending = retry
	}

	metrics.AddRecapEmails(metrics.RecapSent, sent)
	metrics.AddRecapEmails(metrics.RecapUnconfirmed, unconfirmed)
	metrics.AddRecapEmails(metrics.RecapFailed, failed)
	log.Info("sent contest recap emails", "sent", sent, "unconfirmed", unconfirmed, "failed", failed)
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
