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
	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

const (
	recapLoadTimeout = 30 * time.Second
	recapSendTimeout = 2 * time.Minute
	recapAttempts    = 3
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
}

func NewRecapService(contestRepo repository.ContestRepository, playerRepo repository.PlayerRepository, mailer email.Mailer, webURL string, retryDelay time.Duration) RecapService {
	return &recapService{
		contestRepo: contestRepo,
		playerRepo:  playerRepo,
		mailer:      mailer,
		webURL:      webURL,
		retryDelay:  retryDelay,
	}
}

func (s *recapService) Send(ctx context.Context, contestID uuid.UUID) {
	if s.mailer == nil {
		return
	}

	log := logging.FromContext(ctx).With("contest_id", contestID)

	players, content, err := s.prepare(ctx, contestID)
	if err != nil {
		metrics.IncRecapEmail(false)
		log.Error("failed to prepare the recap email", "error", err)
		return
	}

	sent, failed := 0, 0
	for i := range players {
		to := players[i].UserID
		if !strings.Contains(to, "@") {
			continue
		}
		msg := &email.Message{To: to, Subject: content.Subject, HTML: content.HTML, Text: content.Text}
		if err := s.deliver(ctx, msg); err != nil {
			failed++
			metrics.IncRecapEmail(false)
			log.Error("failed to send the recap email", "player_id", players[i].ID, "error", err)
			continue
		}
		sent++
		metrics.IncRecapEmail(true)
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
			return ctx.Err()
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
		return "Removed player"
	default:
		return pseudonym.Public(q.WinnerName)
	}
}

func numbersDrawn(contest *model.Contest) bool {
	xLabels, _, err := util.ParseLabels(contest)
	return err == nil && len(xLabels) > 0 && xLabels[0] >= 0
}
