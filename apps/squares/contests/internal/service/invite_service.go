package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/database"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/squares/initials"
)

type InviteService interface {
	GetInviteLink(ctx context.Context, contestID uuid.UUID, user string) (*model.InviteLinkResponse, error)
	ResetInviteLink(ctx context.Context, contestID uuid.UUID, user string) (*model.InviteLinkResponse, error)
	GetInvitePreview(ctx context.Context, token string) (*model.InvitePreviewResponse, error)
	Join(ctx context.Context, token, user, displayName string) (*model.ContestParticipant, error)
}

type inviteService struct {
	contestRepo        repository.ContestRepository
	participantRepo    repository.ParticipantRepository
	banRepo            repository.BanRepository
	userRepo           repository.UserRepository
	participantService ParticipantService
	tx                 database.Transactor
	events             ContestEventPublisher
}

func NewInviteService(
	contestRepo repository.ContestRepository,
	participantRepo repository.ParticipantRepository,
	banRepo repository.BanRepository,
	userRepo repository.UserRepository,
	participantService ParticipantService,
	tx database.Transactor,
	events ContestEventPublisher,
) InviteService {
	return &inviteService{
		contestRepo:        contestRepo,
		participantRepo:    participantRepo,
		banRepo:            banRepo,
		userRepo:           userRepo,
		participantService: participantService,
		tx:                 tx,
		events:             events,
	}
}

func (s *inviteService) GetInviteLink(ctx context.Context, contestID uuid.UUID, user string) (*model.InviteLinkResponse, error) {
	if err := s.participantService.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return nil, err
	}

	token, err := s.contestRepo.GetInviteToken(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		logging.FromContext(ctx).Error("failed to get invite token", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	return &model.InviteLinkResponse{Token: token}, nil
}

func (s *inviteService) ResetInviteLink(ctx context.Context, contestID uuid.UUID, user string) (*model.InviteLinkResponse, error) {
	log := logging.FromContext(ctx)

	if err := s.participantService.Authorize(ctx, contestID, user, ActionManageParticipants); err != nil {
		return nil, err
	}

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to get contest", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot reset the invite link of a finalized contest", "contest_id", contestID, "status", contest.Status)
		return nil, errs.ErrContestFinalized
	}

	token, err := s.contestRepo.ResetInviteToken(ctx, contestID)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrContestNotFound
		}
		log.Error("failed to reset invite token", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("invite link reset", "contest_id", contestID)
	return &model.InviteLinkResponse{Token: token}, nil
}

func (s *inviteService) GetInvitePreview(ctx context.Context, token string) (*model.InvitePreviewResponse, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	var ownerName string
	owner, err := s.participantRepo.GetByContestAndUser(ctx, contest.ID, contest.Owner)
	switch {
	case err == nil:
		ownerName = owner.DisplayName
	case !errors.Is(err, database.ErrNotFound):
		log.Error("failed to get the owner for invite preview", "contest_id", contest.ID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved invite preview", "contest_id", contest.ID)
	return invitePreview(contest, ownerName), nil
}

func invitePreview(contest *model.Contest, ownerName string) *model.InvitePreviewResponse {
	preview := &model.InvitePreviewResponse{
		ContestID:    contest.ID,
		ContestName:  contest.Name,
		OwnerName:    ownerName,
		Status:       contest.Status,
		TotalSquares: len(contest.Squares),
		HomeTeam:     contest.HomeTeam,
		AwayTeam:     contest.AwayTeam,
	}
	for i := range contest.Squares {
		if contest.Squares[i].Owner != "" {
			preview.ClaimedSquares++
		}
	}
	if contest.Game != nil {
		preview.HomeAbbr = contest.Game.HomeAbbr
		preview.AwayAbbr = contest.Game.AwayAbbr
		kickoff := contest.Game.GameTime
		preview.GameTime = &kickoff
	}
	return preview
}

func (s *inviteService) Join(ctx context.Context, token, user, displayName string) (*model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot join a finalized contest", "contest_id", contest.ID, "status", contest.Status)
		return nil, errs.ErrContestFinalized
	}

	banned, err := s.banRepo.Exists(ctx, contest.ID, user)
	if err != nil {
		log.Error("failed to check for a ban", "contest_id", contest.ID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	if banned {
		log.Warn("banned user tried to rejoin", "contest_id", contest.ID, "user", user)
		return nil, errs.ErrBannedFromContest
	}

	participant := &model.ContestParticipant{
		ContestID:   contest.ID,
		UserID:      user,
		DisplayName: displayName,
		Role:        model.ParticipantRoleParticipant,
	}

	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if createErr := s.participantRepo.Create(ctx, participant); createErr != nil {
			return createErr
		}

		// a first-time participant may join before accounts has published their profile, so the participants list needs a name now
		if _, seedErr := s.userRepo.GetOrCreate(ctx, user, displayName, initials.FromName(displayName)); seedErr != nil {
			return seedErr
		}

		return s.events.PublishParticipantJoined(ctx, contest.ID, participant)
	})
	if err != nil {
		if errors.Is(err, database.ErrDuplicate) {
			log.Warn("user already a participant", "contest_id", contest.ID, "user", user)
			return nil, errs.ErrAlreadyParticipant
		}
		log.Error("failed to join contest", "contest_id", contest.ID, "user", user, "error", err)
		return nil, err
	}

	metrics.IncParticipantJoined(string(model.ParticipantRoleParticipant))
	log.Info("joined contest", "contest_id", contest.ID, "user", user)
	return participant, nil
}

func (s *inviteService) contestByToken(ctx context.Context, token string) (*model.Contest, error) {
	contest, err := s.contestRepo.GetByInviteToken(ctx, token)
	if err != nil {
		if errors.Is(err, database.ErrNotFound) {
			return nil, errs.ErrInviteNotFound
		}
		logging.FromContext(ctx).Error("failed to get contest by invite token", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}
	return contest, nil
}
