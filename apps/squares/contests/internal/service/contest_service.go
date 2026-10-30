package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

const systemUser = "system"

type ContestService interface {
	CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error)
	ApplyQuarterResult(ctx context.Context, contest *model.Contest, quarter, homeScore, awayScore int) (*model.QuarterResult, error)
	FinalizeFromScores(ctx context.Context, contest *model.Contest, scores []model.GameScore) error
	AutoStart(ctx context.Context, contest *model.Contest) error
	FinishCanceled(ctx context.Context, contest *model.Contest) error
	DeleteContest(ctx context.Context, contestID uuid.UUID, user string) error
}

type contestService struct {
	repo               repository.ContestRepository
	gameRepo           repository.GameSyncRepository
	tx                 database.Transactor
	events             ContestEventPublisher
	participantService ParticipantService
}

func NewContestService(
	repo repository.ContestRepository,
	gameRepo repository.GameSyncRepository,
	tx database.Transactor,
	events ContestEventPublisher,
	participantService ParticipantService,
) ContestService {
	return &contestService{
		repo:               repo,
		gameRepo:           gameRepo,
		tx:                 tx,
		events:             events,
		participantService: participantService,
	}
}

func (s *contestService) CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error) {
	log := logging.FromContext(ctx)

	xLabelsJSON, yLabelsJSON := util.InitialLabels()
	visibility := model.ContestVisibilityPrivate
	if req.Visibility == "public" {
		visibility = model.ContestVisibilityPublic
	}

	gameID, err := uuid.Parse(req.GameID)
	if err != nil {
		return nil, errs.ErrGameNotFound
	}

	game, err := s.gameRepo.GetByID(ctx, gameID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrGameNotFound
		}

		log.Error("failed to get game for contest link", "game_id", gameID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if game.Status == model.GameStatusCanceled {
		log.Warn("cannot create contest for a canceled game", "game_id", gameID)
		return nil, errs.ErrGameCanceled
	}

	// a form left open past kickoff still goes through while the first quarter is on
	if game.Status == model.GameStatusFinal || (game.Status == model.GameStatusInProgress && game.Period > 1) {
		log.Warn("cannot create contest for a game past the first quarter", "game_id", gameID, "game_status", game.Status, "period", game.Period)
		return nil, errs.ErrGamePastFirstQuarter
	}

	contest := model.Contest{
		Name:       req.Name,
		XLabels:    xLabelsJSON,
		YLabels:    yLabelsJSON,
		HomeTeam:   game.HomeTeam,
		AwayTeam:   game.AwayTeam,
		GameID:     &game.ID,
		Owner:      req.Owner,
		Visibility: visibility,
		Status:     model.ContestStatusActive,
	}

	ownerParticipant := &model.ContestParticipant{
		UserID:     user,
		Role:       model.ParticipantRoleOwner,
		MaxSquares: req.MaxSquares,
	}
	if err := s.tx.Do(ctx, func(ctx context.Context) error {
		return s.repo.Create(ctx, &contest, ownerParticipant)
	}); err != nil {
		log.Error("failed to create contest with owner participant", "error", err)
		return nil, err
	}

	metrics.IncContestCreated()
	metrics.IncParticipantJoined(string(model.ParticipantRoleOwner))
	log.Info("created contest", "name", req.Name, "contest_id", contest.ID, "owner", req.Owner)
	return &contest, nil
}

func (s *contestService) AutoStart(ctx context.Context, contest *model.Contest) error {
	if err := s.tx.Do(ctx, func(ctx context.Context) error {
		return s.transitionToQ1(ctx, contest, systemUser)
	}); err != nil {
		return err
	}

	metrics.IncContestStarted()
	logging.FromContext(ctx).Info("auto-started game-linked contest", "contest_id", contest.ID)
	return nil
}

func (s *contestService) transitionToQ1(ctx context.Context, contest *model.Contest, user string) error {
	log := logging.FromContext(ctx)

	xLabels, yLabels, err := util.RandomizedLabels()
	if err != nil {
		log.Error("failed to generate randomized labels", "contest_id", contest.ID, "error", err)
		return err
	}

	contest.XLabels = xLabels
	contest.YLabels = yLabels
	contest.Status = model.ContestStatusQ1
	contest.UpdatedBy = user

	if err := s.repo.Update(ctx, contest); err != nil {
		log.Error("failed to save contest with randomized labels", "contest_id", contest.ID, "error", err)
		return err
	}

	if err := s.events.PublishContestUpdate(ctx, contest.ID, user, contest); err != nil {
		return err
	}

	log.Info("transitioned to Q1, labels randomized, squares now immutable", "contest_id", contest.ID)
	return nil
}

func (s *contestService) ApplyQuarterResult(ctx context.Context, contest *model.Contest, quarter, homeScore, awayScore int) (*model.QuarterResult, error) {
	log := logging.FromContext(ctx)

	nextStatus, valid := model.StatusAfterQuarter(quarter)
	if !valid {
		return nil, errs.ErrInvalidQuarter
	}

	result, err := util.QuarterResultFor(contest, quarter, homeScore, awayScore)
	if err != nil {
		return nil, err
	}

	result.CreatedBy = systemUser
	result.UpdatedBy = systemUser

	contest.Status = nextStatus
	results := []model.QuarterResult{*result}
	if err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.applyQuarterResults(ctx, contest, results, systemUser); err != nil {
			return err
		}
		// viewers drop their stream on the finishing contest.updated, so every way to finish ends with one
		if nextStatus != model.ContestStatusFinished {
			return nil
		}
		return s.events.PublishContestUpdate(ctx, contest.ID, systemUser, contest)
	}); err != nil {
		log.Error("failed to apply quarter result", "contest_id", contest.ID, "quarter", quarter, "error", err)
		return nil, err
	}

	return &results[0], nil
}

func (s *contestService) FinalizeFromScores(ctx context.Context, contest *model.Contest, scores []model.GameScore) error {
	log := logging.FromContext(ctx)

	xLabels, yLabels, err := util.RandomizedLabels()
	if err != nil {
		return err
	}

	contest.XLabels = xLabels
	contest.YLabels = yLabels
	contest.Status = model.ContestStatusFinished
	contest.UpdatedBy = systemUser

	results := make([]model.QuarterResult, 0, len(scores))
	for i := range scores {
		result, resultErr := util.QuarterResultFor(contest, scores[i].Quarter, scores[i].HomeScore, scores[i].AwayScore)
		if resultErr != nil {
			log.Warn("skipping quarter on finalize, winner not determinable", "contest_id", contest.ID, "quarter", scores[i].Quarter, "error", resultErr)
			continue
		}

		result.CreatedBy = systemUser
		result.UpdatedBy = systemUser
		results = append(results, *result)
	}

	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if applyErr := s.applyQuarterResults(ctx, contest, results, systemUser); applyErr != nil {
			return applyErr
		}
		return s.events.PublishContestUpdate(ctx, contest.ID, systemUser, contest)
	})
	if err != nil {
		log.Error("failed to finalize contest from scores", "contest_id", contest.ID, "error", err)
		return err
	}

	log.Info("finalized game-linked contest from final scores", "contest_id", contest.ID, "quarters", len(results))
	return nil
}

// a canceled game ends its contests where they stand: played quarters keep their winners, the rest have none,
// and a board that never kicked off finishes without numbers
func (s *contestService) FinishCanceled(ctx context.Context, contest *model.Contest) error {
	log := logging.FromContext(ctx)

	contest.Status = model.ContestStatusFinished
	contest.UpdatedBy = systemUser

	err := s.tx.Do(ctx, func(ctx context.Context) error {
		if err := s.repo.Update(ctx, contest); err != nil {
			return err
		}
		return s.events.PublishContestUpdate(ctx, contest.ID, systemUser, contest)
	})
	if err != nil {
		log.Error("failed to finish contest for canceled game", "contest_id", contest.ID, "error", err)
		return err
	}

	log.Info("finished contest for canceled game", "contest_id", contest.ID)
	return nil
}

func (s *contestService) applyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult, user string) error {
	if err := s.repo.ApplyQuarterResults(ctx, contest, results); err != nil {
		return err
	}

	for i := range results {
		quarter := results[i].Quarter
		database.AfterCommit(ctx, func() { metrics.IncQuarterResult(quarter) })
		if err := s.events.PublishQuarterResult(ctx, contest.ID, user, &results[i]); err != nil {
			return err
		}
	}

	return nil
}

func (s *contestService) DeleteContest(ctx context.Context, contestID uuid.UUID, user string) error {
	log := logging.FromContext(ctx)

	err := s.tx.Do(ctx, func(ctx context.Context) error {
		contest, err := s.repo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			if errors.Is(err, database.ErrNotFound) {
				return errs.ErrContestNotFound
			}
			log.Error("failed to get contest for delete", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		if contest.Status.IsTerminal() {
			log.Warn("cannot delete contest in terminal state", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestFinalized
		}

		if err := s.participantService.Authorize(ctx, contestID, user, ActionDeleteContest); err != nil {
			log.Warn("unauthorized delete attempt", "contest_id", contestID, "user", user)
			return errs.ErrUnauthorizedContestDelete
		}

		if err := s.repo.Delete(ctx, contestID); err != nil {
			log.Error("failed to delete contest from repository", "contest_id", contestID, "error", err)
			return err
		}

		return s.events.PublishContestDeleted(ctx, contestID, user)
	})
	if err != nil {
		return err
	}

	metrics.IncContestDeleted()
	log.Info("deleted contest successfully", "contest_id", contestID)
	return nil
}
