package service

import (
	"context"
	"errors"

	"github.com/maxmorhardt/maxhq/libs/squares/initials"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"gorm.io/gorm"
)

const systemUser = "system"

type ContestService interface {
	CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error)
	ApplyQuarterResult(ctx context.Context, contest *model.Contest, quarter, homeScore, awayScore int) (*model.QuarterResult, error)
	FinalizeFromScores(ctx context.Context, contest *model.Contest, scores []model.GameScore) error
	AutoStart(ctx context.Context, contest *model.Contest) error
	DeleteContest(ctx context.Context, contestID uuid.UUID, user string) error

	ClaimSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error)
	ClaimRandomSquares(ctx context.Context, contestID uuid.UUID, count int, user string) (*model.RandomClaimResponse, error)
	ClearSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error)
	ClearUserSquares(ctx context.Context, contestID uuid.UUID, user string) ([]model.Square, error)
}

type contestService struct {
	repo               repository.ContestRepository
	participantRepo    repository.ParticipantRepository
	gameRepo           repository.GameProjectionRepository
	userRepo           repository.UserProjectionRepository
	tx                 database.Transactor
	events             ContestEventPublisher
	participantService ParticipantService
}

func NewContestService(
	repo repository.ContestRepository,
	participantRepo repository.ParticipantRepository,
	gameRepo repository.GameProjectionRepository,
	userRepo repository.UserProjectionRepository,
	tx database.Transactor,
	events ContestEventPublisher,
	participantService ParticipantService,
) ContestService {
	return &contestService{
		repo:               repo,
		participantRepo:    participantRepo,
		gameRepo:           gameRepo,
		userRepo:           userRepo,
		tx:                 tx,
		events:             events,
		participantService: participantService,
	}
}

func (s *contestService) CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error) {
	log := logging.FromContext(ctx)

	exists, err := s.repo.ExistsByOwnerAndName(ctx, req.Owner, req.Name)
	if err != nil {
		log.Error("failed to check if contest exists", "owner", req.Owner, "name", req.Name, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if exists {
		log.Warn("contest already exists", "owner", req.Owner, "name", req.Name)
		return nil, errs.ErrContestAlreadyExists
	}

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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrGameNotFound
		}

		log.Error("failed to get game for contest link", "game_id", gameID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
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
	if err := s.repo.Create(ctx, &contest, ownerParticipant); err != nil {
		log.Error("failed to create contest with owner participant", "error", err)
		return nil, err
	}

	metrics.IncContestCreated()
	metrics.IncParticipantJoined(string(model.ParticipantRoleOwner))
	log.Info("created contest", "name", req.Name, "contest_id", contest.ID, "owner", req.Owner)
	return &contest, nil
}

func (s *contestService) AutoStart(ctx context.Context, contest *model.Contest) error {
	if err := s.transitionToQ1(ctx, contest, systemUser); err != nil {
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
	if err := s.applyQuarterResults(ctx, contest, results, systemUser); err != nil {
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

	if err := s.applyQuarterResults(ctx, contest, results, systemUser); err != nil {
		log.Error("failed to finalize contest from scores", "contest_id", contest.ID, "error", err)
		return err
	}

	if err := s.events.PublishContestUpdate(ctx, contest.ID, systemUser, contest); err != nil {
		return err
	}

	log.Info("finalized game-linked contest from final scores", "contest_id", contest.ID, "quarters", len(results))
	return nil
}

func (s *contestService) applyQuarterResults(ctx context.Context, contest *model.Contest, results []model.QuarterResult, user string) error {
	if err := s.repo.ApplyQuarterResults(ctx, contest, results); err != nil {
		return err
	}

	for i := range results {
		metrics.IncQuarterResult(results[i].Quarter)
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
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return err
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

func (s *contestService) ClaimSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for square claim", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot update square when contest is not active", "square_id", squareID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
	}

	if err = s.participantService.Authorize(ctx, contestID, user, ActionClaimSquare); err != nil {
		log.Warn("user not authorized to claim squares", "contest_id", contestID, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	square := findSquare(contest, squareID)
	if square == nil {
		log.Warn("square not found in contest", "square_id", squareID, "contest_id", contestID)
		return nil, gorm.ErrRecordNotFound
	}

	if square.Owner != "" && square.Owner != user {
		log.Warn("user not authorized to update square", "square_id", squareID, "owner", square.Owner, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, user)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Warn("user is not a participant", "contest_id", contestID, "user", user)
			return nil, errs.ErrNotParticipant
		}
		log.Error("failed to get participant for square limit check", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	// capture whether the square was unclaimed before the update mutates square.Owner
	wasUnclaimed := square.Owner == ""

	if wasUnclaimed {
		claimed, countErr := s.participantRepo.CountSquaresByUser(ctx, contestID, user)
		if countErr != nil {
			log.Error("failed to count user squares", "contest_id", contestID, "user", user, "error", countErr)
			return nil, errs.ErrDatabaseUnavailable
		}

		if claimed >= participant.MaxSquares {
			log.Warn("user has reached square limit", "contest_id", contestID, "user", user, "claimed", claimed, "limit", participant.MaxSquares)
			return nil, errs.ErrSquareLimitReached
		}
	}

	claims := api.ClaimsFromContext(ctx)
	if claims == nil {
		log.Error("claims not found in context")
		return nil, errs.ErrClaimsNotFound
	}

	profile, err := s.userRepo.GetOrCreate(ctx, user, claims.Name, initials.FromName(claims.Name))
	if err != nil {
		log.Error("failed to load profile for square claim", "user", user, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if profile.DefaultInitials == "" {
		log.Warn("user has no default initials set", "user", user)
		return nil, errs.ErrMissingInitials
	}

	// the repository re-checks status, ownership, and the limit atomically, so it is the authority on all three
	var claimedSquare *model.Square
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		var claimErr error
		claimedSquare, claimErr = s.repo.ClaimSquare(ctx, square, profile.DefaultInitials, user, claims.Name)
		if claimErr != nil {
			return claimErr
		}

		return s.events.PublishSquareUpdate(ctx, contest.ID, user, claimedSquare)
	})
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrSquareTaken):
			log.Warn("square claimed by another user first", "square_id", square.ID, "user", user)
		case errors.Is(err, errs.ErrSquareLimitReached):
			log.Warn("concurrent claims exceeded square limit", "contest_id", contestID, "user", user)
		case errors.Is(err, errs.ErrSquareNotEditable):
			log.Warn("contest left ACTIVE before the claim committed", "contest_id", contestID, "user", user)
		default:
			log.Error("failed to claim square", "square_id", square.ID, "value", profile.DefaultInitials, "owner", user, "error", err)
		}
		return nil, err
	}

	if wasUnclaimed {
		metrics.IncSquareClaimed()
	}

	log.Info("square claimed successfully", "square_id", square.ID, "value", profile.DefaultInitials, "owner", user)
	return claimedSquare, nil
}

func (s *contestService) ClaimRandomSquares(ctx context.Context, contestID uuid.UUID, count int, user string) (*model.RandomClaimResponse, error) {
	log := logging.FromContext(ctx).With("contest_id", contestID, "user", user)

	if err := s.participantService.Authorize(ctx, contestID, user, ActionClaimSquare); err != nil {
		if errors.Is(err, errs.ErrNotParticipant) || errors.Is(err, errs.ErrDatabaseUnavailable) {
			return nil, err
		}
		log.Warn("user not authorized to claim squares")
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	claims := api.ClaimsFromContext(ctx)
	if claims == nil {
		log.Error("claims not found in context")
		return nil, errs.ErrClaimsNotFound
	}

	profile, err := s.userRepo.GetOrCreate(ctx, user, claims.Name, initials.FromName(claims.Name))
	if err != nil {
		log.Error("failed to load profile for random claim", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	if profile.DefaultInitials == "" {
		return nil, errs.ErrMissingInitials
	}

	var claimed []model.Square
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		var claimErr error
		claimed, claimErr = s.repo.ClaimRandomSquares(ctx, contestID, count, profile.DefaultInitials, user, claims.Name)
		if claimErr != nil {
			return claimErr
		}

		for i := range claimed {
			if pubErr := s.events.PublishSquareUpdate(ctx, contestID, user, &claimed[i]); pubErr != nil {
				return pubErr
			}
		}
		return nil
	})
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrSquareLimitReached), errors.Is(err, errs.ErrNoEmptySquares), errors.Is(err, errs.ErrSquareNotEditable):
			log.Warn("random claim rejected", "error", err)
		default:
			log.Error("failed to claim random squares", "error", err)
		}
		return nil, err
	}

	for range claimed {
		metrics.IncSquareClaimed()
	}

	log.Info("claimed random squares", "requested", count, "claimed", len(claimed))
	return &model.RandomClaimResponse{Squares: claimed, Requested: count}, nil
}

func (s *contestService) ClearSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for square clear", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot clear square when contest is not active", "square_id", squareID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
	}

	// a full board is final: every square stays as claimed until kickoff
	if util.AllSquaresClaimed(contest) {
		log.Warn("cannot clear a square on a full board", "square_id", squareID, "contest_id", contestID)
		return nil, errs.ErrBoardLocked
	}

	square := findSquare(contest, squareID)
	if square == nil {
		log.Warn("square not found in contest", "square_id", squareID, "contest_id", contestID)
		return nil, gorm.ErrRecordNotFound
	}

	isSquareOwner := square.Owner == user
	editErr := s.participantService.Authorize(ctx, contestID, user, ActionEditContest)
	if editErr != nil && !isSquareOwner {
		log.Warn("user not authorized to clear square", "square_id", squareID, "square_owner", square.Owner, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	var clearedSquare *model.Square
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		var clearErr error
		clearedSquare, clearErr = s.repo.ClearSquare(ctx, square)
		if clearErr != nil {
			return clearErr
		}

		return s.events.PublishSquareUpdate(ctx, contest.ID, user, clearedSquare)
	})
	if err != nil {
		log.Warn("failed to clear square", "square_id", square.ID, "error", err)
		return nil, err
	}

	metrics.IncSquareCleared()
	log.Info("square cleared successfully", "square_id", square.ID)
	return clearedSquare, nil
}

func (s *contestService) ClearUserSquares(ctx context.Context, contestID uuid.UUID, user string) ([]model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for clearing user squares", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot clear squares when contest is not active", "contest_id", contestID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
	}

	if util.AllSquaresClaimed(contest) {
		log.Warn("cannot clear squares on a full board", "contest_id", contestID, "user", user)
		return nil, errs.ErrBoardLocked
	}

	var clearedSquares []model.Square
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		var clearErr error
		clearedSquares, clearErr = s.repo.ClearSquaresByOwner(ctx, contestID, user)
		if clearErr != nil {
			return clearErr
		}

		for i := range clearedSquares {
			if publishErr := s.events.PublishSquareUpdate(ctx, contest.ID, user, &clearedSquares[i]); publishErr != nil {
				return publishErr
			}
		}

		return nil
	})
	if err != nil {
		log.Warn("failed to clear user squares", "contest_id", contestID, "user", user, "error", err)
		return nil, err
	}

	for range clearedSquares {
		metrics.IncSquareCleared()
	}

	log.Info("user squares cleared successfully", "contest_id", contestID, "user", user, "count", len(clearedSquares))
	return clearedSquares, nil
}

func findSquare(contest *model.Contest, squareID uuid.UUID) *model.Square {
	for i := range contest.Squares {
		if contest.Squares[i].ID == squareID {
			return &contest.Squares[i]
		}
	}

	return nil
}
