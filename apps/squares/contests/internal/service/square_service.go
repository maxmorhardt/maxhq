package service

import (
	"context"
	"errors"

	"github.com/maxmorhardt/maxhq/libs/go/squares/initials"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/util"
	"github.com/maxmorhardt/maxhq/libs/go/platform/api"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
)

type SquareService interface {
	Claim(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error)
	ClaimRandom(ctx context.Context, contestID uuid.UUID, count int, user string) (*model.RandomClaimResponse, error)
	Clear(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error)
	ClearByOwner(ctx context.Context, contestID uuid.UUID, user string) ([]model.Square, error)
}

type squareService struct {
	squareRepo         repository.SquareRepository
	contestRepo        repository.ContestRepository
	participantRepo    repository.ParticipantRepository
	userRepo           repository.UserRepository
	tx                 database.Transactor
	events             ContestEventPublisher
	participantService ParticipantService
}

func NewSquareService(
	squareRepo repository.SquareRepository,
	contestRepo repository.ContestRepository,
	participantRepo repository.ParticipantRepository,
	userRepo repository.UserRepository,
	tx database.Transactor,
	events ContestEventPublisher,
	participantService ParticipantService,
) SquareService {
	return &squareService{
		squareRepo:         squareRepo,
		contestRepo:        contestRepo,
		participantRepo:    participantRepo,
		userRepo:           userRepo,
		tx:                 tx,
		events:             events,
		participantService: participantService,
	}
}

func (s *squareService) Claim(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest for square claim", "contest_id", contestID, "error", err)
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
		return nil, errs.ErrSquareNotFound
	}

	if square.Owner != "" && square.Owner != user {
		log.Warn("user not authorized to update square", "square_id", squareID, "owner", square.Owner, "user", user)
		return nil, errs.ErrUnauthorizedSquareEdit
	}

	participant, err := s.participantRepo.GetByContestAndUser(ctx, contestID, user)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			log.Warn("user is not a participant", "contest_id", contestID, "user", user)
			return nil, errs.ErrNotParticipant
		}
		log.Error("failed to get participant for square limit check", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	// capture whether the square was unclaimed before the update mutates square.Owner
	wasUnclaimed := square.Owner == ""

	if wasUnclaimed {
		claimed, countErr := s.squareRepo.CountByOwner(ctx, contestID, user)
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
		claimedSquare, claimErr = s.squareRepo.Claim(ctx, square, profile.DefaultInitials, user, claims.Name)
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

func (s *squareService) ClaimRandom(ctx context.Context, contestID uuid.UUID, count int, user string) (*model.RandomClaimResponse, error) {
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
		claimed, claimErr = s.squareRepo.ClaimRandom(ctx, contestID, count, profile.DefaultInitials, user, claims.Name)
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

func (s *squareService) Clear(ctx context.Context, contestID, squareID uuid.UUID, user string) (*model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest for square clear", "contest_id", contestID, "error", err)
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
		return nil, errs.ErrSquareNotFound
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
		clearedSquare, clearErr = s.squareRepo.Clear(ctx, square)
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

func (s *squareService) ClearByOwner(ctx context.Context, contestID uuid.UUID, user string) ([]model.Square, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest for clearing user squares", "contest_id", contestID, "error", err)
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
		clearedSquares, clearErr = s.squareRepo.ClearByOwner(ctx, contestID, user)
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
