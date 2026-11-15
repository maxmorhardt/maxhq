package service

import (
	"context"
	"errors"
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
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

const (
	recapLoadTimeout = 30 * time.Second
	recapSendTimeout = 2 * time.Minute
	recapAttempts    = 3
	recapConcurrency = 2
)

type RecapService interface {
	Send(ctx context.Context, contestID uuid.UUID)
}

type recapService struct {
	contestRepo repository.ContestRepository
	playerRepo  repository.PlayerRepository
	mailer      email.Mailer
	webURL      string
	retryDelay  time.Duration
	slots       chan struct{}
}

func NewRecapService(contestRepo repository.ContestRepository, playerRepo repository.PlayerRepository, mailer email.Mailer, webURL string, retryDelay time.Duration) RecapService {
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
		metrics.IncRecapAborted()
		log.Error("failed to prepare the recap email", "error", err)
		return
	}

	recipients := make([]model.ContestPlayer, 0, len(players))
	for i := range players {
		if strings.Contains(players[i].UserID, "@") {
			recipients = append(recipients, players[i])
		}
	}

	sent, failed := 0, 0
	for i := range recipients {
		msg := &email.Message{To: recipients[i].UserID, Subject: content.Subject, HTML: content.HTML, Text: content.Text}
		err := s.deliver(ctx, msg)
		if err == nil {
			sent++
			metrics.IncRecapEmail(true)
			continue
		}
		if errors.Is(err, email.ErrConnection) {
			remaining := len(recipients) - i
			failed += remaining
			for range remaining {
				metrics.IncRecapEmail(false)
			}
			log.Error("could not reach the mail server, so the rest of the recap emails were not sent", "unsent", remaining, "error", err)
			break
		}
		failed++
		metrics.IncRecapEmail(false)
		log.Error("failed to send the recap email", "player_id", recipients[i].ID, "error", err)
	}

	log.Info("sent contest recap emails", "sent", sent, "failed", failed)
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

func (s *recapService) deliver(ctx context.Context, msg *email.Message) error {
	ctx, cancel := context.WithTimeout(ctx, recapSendTimeout)
	defer cancel()

	var err error
	for attempt := 1; attempt <= recapAttempts; attempt++ {
		if err = s.mailer.Send(ctx, msg); err == nil || email.IsPermanent(err) || attempt == recapAttempts {
			return err
		}
		select {
		case <-ctx.Done():
			return errors.Join(err, ctx.Err())
		case <-time.After(s.retryDelay * time.Duration(attempt)):
		}
	}
	return err
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
