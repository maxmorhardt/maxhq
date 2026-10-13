package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxstash/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxstash/libs/platform/database"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"gorm.io/gorm"
)

const systemUser = "system"

type ContestService interface {
	GetContestsByOwnerPaginated(ctx context.Context, owner string, page, limit int, search string) ([]model.Contest, int64, error)

	CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error)
	UpdateContest(ctx context.Context, contestID uuid.UUID, req *model.UpdateContestRequest, user string, expectedVersion *int64) (*model.Contest, error)
	StartContest(ctx context.Context, contestID uuid.UUID, user string) (*model.Contest, error)
	RecordQuarterResult(ctx context.Context, contestID uuid.UUID, homeScore, awayScore int, user string) (*model.QuarterResult, error)
	ApplyQuarterResult(ctx context.Context, contest *model.Contest, quarter, homeScore, awayScore int) (*model.QuarterResult, error)
	FinalizeFromScores(ctx context.Context, contest *model.Contest, scores []model.GameScore) error
	AutoStart(ctx context.Context, contest *model.Contest) error
	RollbackLastQuarterResult(ctx context.Context, contestID uuid.UUID, user string) (*model.QuarterResult, error)
	DeleteContest(ctx context.Context, contestID uuid.UUID, user string) error

	ClaimSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error)
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

// ====================
// Getters
// ====================

func (s *contestService) GetContestsByOwnerPaginated(ctx context.Context, owner string, page, limit int, search string) ([]model.Contest, int64, error) {
	log := reqctx.LoggerFromContext(ctx)

	contests, total, err := s.repo.GetAllByOwnerPaginated(ctx, owner, page, limit, search)
	if err != nil {
		log.Error("failed to get paginated contests by user", "owner", owner, "error", err)
		return nil, 0, err
	}

	log.Info("retrieved paginated contests by owner", "count", len(contests))
	return contests, total, nil
}

// ====================
// Contest Lifecycle Actions
// ====================

func (s *contestService) CreateContest(ctx context.Context, req *model.CreateContestRequest, user string) (*model.Contest, error) {
	log := reqctx.LoggerFromContext(ctx)

	// check if contest name already exists for user
	exists, err := s.repo.ExistsByOwnerAndName(ctx, req.Owner, req.Name)
	if err != nil {
		log.Error("failed to check if contest exists", "owner", req.Owner, "name", req.Name, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if exists {
		log.Warn("contest already exists", "owner", req.Owner, "name", req.Name)
		return nil, errs.ErrContestAlreadyExists
	}

	// build contest with initial labels
	xLabelsJSON, yLabelsJSON := util.InitialLabels()
	visibility := model.ContestVisibilityPrivate
	if req.Visibility == "public" {
		visibility = model.ContestVisibilityPublic
	}

	contest := model.Contest{
		Name:       req.Name,
		XLabels:    xLabelsJSON,
		YLabels:    yLabelsJSON,
		HomeTeam:   req.HomeTeam,
		AwayTeam:   req.AwayTeam,
		Owner:      req.Owner,
		Visibility: visibility,
		Status:     model.ContestStatusActive,
	}

	// game-linked contest scores automatically and takes its teams from the game
	if req.GameID != "" {
		gameID, parseErr := uuid.Parse(req.GameID)
		if parseErr != nil {
			return nil, errs.ErrGameNotFound
		}
		game, gameErr := s.gameRepo.GetByID(ctx, gameID)
		if gameErr != nil {
			if errors.Is(gameErr, gorm.ErrRecordNotFound) {
				return nil, errs.ErrGameNotFound
			}

			log.Error("failed to get game for contest link", "game_id", gameID, "error", gameErr)
			return nil, errs.ErrDatabaseUnavailable
		}

		// set the foreign key and team names
		contest.GameID = &game.ID
		contest.HomeTeam = game.HomeTeam
		contest.AwayTeam = game.AwayTeam
	}

	// atomically create contest, squares, and owner participant
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

func (s *contestService) UpdateContest(ctx context.Context, contestID uuid.UUID, req *model.UpdateContestRequest, user string, expectedVersion *int64) (*model.Contest, error) {
	log := reqctx.LoggerFromContext(ctx)

	var contest *model.Contest
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		var err error
		contest, err = s.repo.GetByID(ctx, contestID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				log.Warn("contest not found for update", "contest_id", contestID)
				return err
			}

			log.Error("failed to get contest for ownership validation", "contest_id", contestID, "error", err)
			return errs.ErrDatabaseUnavailable
		}

		// the client edited a version that is no longer current
		if expectedVersion != nil && *expectedVersion != contest.Version {
			log.Warn("contest update precondition failed", "contest_id", contestID, "expected", *expectedVersion, "current", contest.Version)
			return errs.ErrVersionConflict
		}

		// game-linked contests read their quarter results from the shared game record
		util.SynthesizeFromGame(contest)

		if contest.Status.IsTerminal() {
			log.Warn("cannot update contest in terminal state", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestFinalized
		}

		if err := s.participantService.Authorize(ctx, contestID, user, ActionEditContest); err != nil {
			log.Warn("user is not authorized to update contest", "contest_id", contestID, "user", user)
			return errs.ErrUnauthorizedContestEdit
		}

		if !applyContestChanges(contest, req) {
			log.Info("no changes detected for contest update", "contest_id", contest.ID)
			return nil
		}

		// the version check in the repository rejects this write if anyone changed the contest since it was read
		contest.UpdatedBy = user
		if err := s.repo.Update(ctx, contest); err != nil {
			log.Warn("failed to save updated contest", "contest_id", contest.ID, "error", err)
			return err
		}

		return s.events.PublishContestUpdate(ctx, contest.ID, user, contest)
	})
	if err != nil {
		return nil, err
	}

	log.Info("contest updated successfully", "contest_id", contest.ID, "user", user)
	return contest, nil
}

func applyContestChanges(contest *model.Contest, req *model.UpdateContestRequest) bool {
	// game-linked contests take their team names from the game record
	canEditTeams := contest.GameID == nil

	changed := false
	if canEditTeams && req.HomeTeam != nil && *req.HomeTeam != contest.HomeTeam {
		contest.HomeTeam = *req.HomeTeam
		changed = true
	}

	if canEditTeams && req.AwayTeam != nil && *req.AwayTeam != contest.AwayTeam {
		contest.AwayTeam = *req.AwayTeam
		changed = true
	}

	// visibility is editable regardless of game link, as long as the contest isn't terminal
	if req.Visibility != nil && model.ContestVisibility(*req.Visibility) != contest.Visibility {
		contest.Visibility = model.ContestVisibility(*req.Visibility)
		changed = true
	}

	return changed
}

func (s *contestService) StartContest(ctx context.Context, contestID uuid.UUID, user string) (*model.Contest, error) {
	log := reqctx.LoggerFromContext(ctx)

	var contest *model.Contest
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		// the row lock waits out in-flight claims and clears, so the full-grid check below sees their result
		var err error
		contest, err = s.repo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			log.Error("failed to get contest", "contest_id", contestID, "error", err)
			return err
		}

		// game-linked contests start automatically at kickoff; owners can't start them
		if contest.GameID != nil {
			log.Warn("cannot manually start a game-linked contest", "contest_id", contestID)
			return errs.ErrContestIsGameLinked
		}

		if contest.Status != model.ContestStatusActive {
			log.Warn("cannot start contest, not in ACTIVE status", "contest_id", contestID, "current_status", contest.Status)
			return errs.ErrContestNotEditable
		}

		if !util.AllSquaresClaimed(contest) {
			log.Warn("cannot start contest - unclaimed squares remain", "contest_id", contestID)
			return errs.ErrContestNotReady
		}

		return s.transitionToQ1(ctx, contest, user)
	})
	if err != nil {
		return nil, err
	}

	metrics.IncContestStarted()
	log.Info("contest started successfully", "contest_id", contestID)
	return contest, nil
}

// game-linked contests lock and randomize on their own once the game kicks off with a full grid
func (s *contestService) AutoStart(ctx context.Context, contest *model.Contest) error {
	if err := s.transitionToQ1(ctx, contest, systemUser); err != nil {
		return err
	}

	metrics.IncContestStarted()
	reqctx.LoggerFromContext(ctx).Info("auto-started game-linked contest", "contest_id", contest.ID)
	return nil
}

func (s *contestService) transitionToQ1(ctx context.Context, contest *model.Contest, user string) error {
	log := reqctx.LoggerFromContext(ctx)

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

func (s *contestService) RecordQuarterResult(ctx context.Context, contestID uuid.UUID, homeScore, awayScore int, user string) (*model.QuarterResult, error) {
	log := reqctx.LoggerFromContext(ctx)

	var recorded *model.QuarterResult
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		contest, err := s.repo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			log.Error("failed to get contest", "contest_id", contestID, "error", err)
			return err
		}

		// game-linked contests are scored automatically; they exit before the auth check so they're unaffected by it
		if contest.GameID != nil {
			log.Warn("cannot manually record quarter result for a game-linked contest", "contest_id", contestID)
			return errs.ErrContestIsGameLinked
		}

		// only the contest owner may record scores
		if err = s.participantService.Authorize(ctx, contestID, user, ActionEditContest); err != nil {
			log.Warn("user is not authorized to record quarter result", "contest_id", contestID, "user", user)
			return errs.ErrUnauthorizedContestEdit
		}

		// determine quarter and next status from current contest status
		quarter, ok := contest.Status.Quarter()
		if !ok {
			log.Warn("invalid contest status for recording quarter result", "contest_id", contestID, "status", contest.Status)
			return errs.ErrContestNotEditable
		}
		nextStatus, _ := model.StatusAfterQuarter(quarter)

		// no duplicate quarter results
		for i := range contest.QuarterResults {
			if contest.QuarterResults[i].Quarter == quarter {
				log.Warn("quarter result already exists for given quarter", "quarter", quarter)
				return errs.ErrQuarterResultAlreadyExists
			}
		}

		// compute the winning square from this contest's labels
		result, err := util.QuarterResultFor(contest, quarter, homeScore, awayScore)
		if err != nil {
			log.Error("failed to compute quarter result", "contest_id", contestID, "error", err)
			return err
		}

		result.CreatedBy = user
		result.UpdatedBy = user

		contest.Status = nextStatus
		results := []model.QuarterResult{*result}
		if err := s.applyQuarterResults(ctx, contest, results, user); err != nil {
			log.Error("failed to record quarter result", "contest_id", contestID, "quarter", quarter, "error", err)
			return err
		}

		recorded = &results[0]
		log.Info("quarter result recorded and status transitioned", "contest_id", contestID, "quarter", quarter, "winner", result.Winner, "new_status", nextStatus)
		return nil
	})
	if err != nil {
		return nil, err
	}

	return recorded, nil
}

func (s *contestService) ApplyQuarterResult(ctx context.Context, contest *model.Contest, quarter, homeScore, awayScore int) (*model.QuarterResult, error) {
	log := reqctx.LoggerFromContext(ctx)

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
	log := reqctx.LoggerFromContext(ctx)

	// assign labels and empty squares don't win
	xLabels, yLabels, err := util.RandomizedLabels()
	if err != nil {
		return err
	}

	contest.XLabels = xLabels
	contest.YLabels = yLabels
	contest.Status = model.ContestStatusFinished
	contest.UpdatedBy = systemUser

	// labels are assigned above, so every quarter resolves against the grid this contest finishes with
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

	// notify clients the contest resolved
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

	// publish in quarter order so clients apply the quarters sequentially
	for i := range results {
		metrics.IncQuarterResult(results[i].Quarter)
		if err := s.events.PublishQuarterResult(ctx, contest.ID, user, &results[i]); err != nil {
			return err
		}
	}

	return nil
}

func (s *contestService) RollbackLastQuarterResult(ctx context.Context, contestID uuid.UUID, user string) (*model.QuarterResult, error) {
	log := reqctx.LoggerFromContext(ctx)

	var rolledBack *model.QuarterResult
	var quarter int
	err := s.tx.Do(ctx, func(ctx context.Context) error {
		contest, err := s.repo.GetByIDForUpdate(ctx, contestID)
		if err != nil {
			log.Error("failed to get contest", "contest_id", contestID, "error", err)
			return err
		}

		// game-linked contests are scored automatically; they exit before the auth check so they're unaffected by it
		if contest.GameID != nil {
			log.Warn("cannot roll back quarter result for a game-linked contest", "contest_id", contestID)
			return errs.ErrContestIsGameLinked
		}

		// only the contest owner may roll back scores
		if err = s.participantService.Authorize(ctx, contestID, user, ActionEditContest); err != nil {
			log.Warn("user is not authorized to roll back quarter result", "contest_id", contestID, "user", user)
			return errs.ErrUnauthorizedContestEdit
		}

		// determine the most recently recorded quarter and the status to revert to
		var revertStatus model.ContestStatus
		var ok bool
		revertStatus, quarter, ok = model.PreviousQuarterStatus(contest.Status)
		if !ok {
			log.Warn("no quarter result to roll back for current status", "contest_id", contestID, "status", contest.Status)
			return errs.ErrNoQuarterResultToRollback
		}

		// find the recorded result for that quarter
		for i := range contest.QuarterResults {
			if contest.QuarterResults[i].Quarter == quarter {
				rolledBack = &contest.QuarterResults[i]
				break
			}
		}
		if rolledBack == nil {
			log.Warn("quarter result missing for rollback", "contest_id", contestID, "quarter", quarter)
			return errs.ErrNoQuarterResultToRollback
		}

		// delete the result and revert the contest status atomically
		contest.Status = revertStatus
		contest.UpdatedBy = user
		if err := s.repo.RollbackQuarterResult(ctx, rolledBack.ID, contest); err != nil {
			log.Error("failed to roll back quarter result", "contest_id", contestID, "quarter", quarter, "error", err)
			return err
		}

		// connected clients drop the quarter and revert status
		return s.events.PublishQuarterResultRollback(ctx, contest.ID, user, rolledBack, contest)
	})
	if err != nil {
		return nil, err
	}

	metrics.IncQuarterResultRolledBack(quarter)
	log.Info("quarter result rolled back and status reverted", "contest_id", contestID, "quarter", quarter)
	return rolledBack, nil
}

func (s *contestService) DeleteContest(ctx context.Context, contestID uuid.UUID, user string) error {
	log := reqctx.LoggerFromContext(ctx)

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

// ====================
// Square Actions
// ====================

func (s *contestService) ClaimSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := reqctx.LoggerFromContext(ctx)

	// get contest to check status and find square
	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for square claim", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		return nil, errs.ErrDatabaseUnavailable
	}

	// a fast early answer; the repository re-checks the status under a lock
	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot update square when contest is not active", "square_id", squareID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
	}

	// check role-based permission to claim squares
	if err = s.participantService.Authorize(ctx, contestID, user, ActionClaimSquare); err != nil {
		log.Warn("user not authorized to claim squares", "contest_id", contestID, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	square := findSquare(contest, squareID)
	if square == nil {
		log.Warn("square not found in contest", "square_id", squareID, "contest_id", contestID)
		return nil, gorm.ErrRecordNotFound
	}

	// a claimed square can only be re-claimed by its owner
	if square.Owner != "" && square.Owner != user {
		log.Warn("user not authorized to update square", "square_id", squareID, "owner", square.Owner, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	// enforce square limit for the participant
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

	// only check limit if claiming a new square (not re-editing own square)
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

	// get claims so we can capture the owner's display name
	claims := reqctx.ClaimsFromContext(ctx)
	if claims == nil {
		log.Error("claims not found in context")
		return nil, errs.ErrClaimsNotFound
	}

	// the square value is the claimant's profile default initials, seeded from their name on first visit
	profile, err := s.userRepo.GetOrCreate(ctx, user, claims.Name, util.InitialsFromName(claims.Name))
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

func (s *contestService) ClearSquare(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := reqctx.LoggerFromContext(ctx)

	// get contest to check status and find square
	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for square clear", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		return nil, errs.ErrDatabaseUnavailable
	}

	// a fast early answer; the repository re-checks the status under a lock
	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot clear square when contest is not active", "square_id", squareID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
	}

	square := findSquare(contest, squareID)
	if square == nil {
		log.Warn("square not found in contest", "square_id", squareID, "contest_id", contestID)
		return nil, gorm.ErrRecordNotFound
	}

	// check authorization - allow if user can edit contest or is the square owner
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
	log := reqctx.LoggerFromContext(ctx)

	// get contest to check status
	contest, err := s.repo.GetByID(ctx, contestID)
	if err != nil {
		log.Error("failed to get contest for clearing user squares", "contest_id", contestID, "error", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		return nil, errs.ErrDatabaseUnavailable
	}

	// a fast early answer; the repository re-checks the status under a lock
	if contest.Status != model.ContestStatusActive {
		log.Warn("cannot clear squares when contest is not active", "contest_id", contestID, "contest_status", contest.Status)
		return nil, errs.ErrSquareNotEditable
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
