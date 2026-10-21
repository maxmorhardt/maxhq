package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/platform/database"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
	"gorm.io/gorm"
)

type InviteService interface {
	CreateInvite(ctx context.Context, contestID uuid.UUID, req *model.CreateInviteRequest, user string) (*model.ContestInvite, error)
	GetInvitePreview(ctx context.Context, token string) (*model.InvitePreviewResponse, error)
	RedeemInvite(ctx context.Context, token, user string) (*model.ContestParticipant, error)
	GetInvitesByContestID(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestInvite, error)
	DeleteInvite(ctx context.Context, contestID, inviteID uuid.UUID, user string) error
}

type inviteService struct {
	inviteRepo         repository.InviteRepository
	participantRepo    repository.ParticipantRepository
	contestRepo        repository.ContestRepository
	participantService ParticipantService
	tx                 database.Transactor
	events             ContestEventPublisher
}

func NewInviteService(
	inviteRepo repository.InviteRepository,
	participantRepo repository.ParticipantRepository,
	contestRepo repository.ContestRepository,
	participantService ParticipantService,
	tx database.Transactor,
	events ContestEventPublisher,
) InviteService {
	return &inviteService{
		inviteRepo:         inviteRepo,
		participantRepo:    participantRepo,
		contestRepo:        contestRepo,
		participantService: participantService,
		tx:                 tx,
		events:             events,
	}
}

func (s *inviteService) CreateInvite(ctx context.Context, contestID uuid.UUID, req *model.CreateInviteRequest, user string) (*model.ContestInvite, error) {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		log.Error("failed to get contest", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot create invite for contest in terminal state", "contest_id", contestID, "status", contest.Status)
		return nil, errs.ErrContestFinalized
	}

	if err := s.participantService.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
		return nil, err
	}

	role := model.ParticipantRole(req.Role)
	if role == model.ParticipantRoleViewer {
		req.MaxSquares = 0
	} else if req.MaxSquares < 1 {
		return nil, errs.ErrInvalidSquareCount
	}

	invite := &model.ContestInvite{
		ContestID:  contestID,
		MaxSquares: req.MaxSquares,
		Role:       role,
		CreatedBy:  user,
		MaxUses:    req.MaxUses,
	}

	if req.ExpiresIn > 0 {
		expiresAt := time.Now().Add(time.Duration(req.ExpiresIn) * time.Minute)
		invite.ExpiresAt = &expiresAt
	}

	if err := s.inviteRepo.Create(ctx, invite); err != nil {
		log.Error("failed to create invite", "contest_id", contestID, "error", err)
		return nil, err
	}

	metrics.IncInviteCreated()
	log.Info("invite created", "invite_id", invite.ID, "contest_id", contestID, "token", invite.Token)
	return invite, nil
}

func (s *inviteService) GetInvitePreview(ctx context.Context, token string) (*model.InvitePreviewResponse, error) {
	log := logging.FromContext(ctx)

	invite, err := s.inviteRepo.GetByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrInviteNotFound
		}
		log.Error("failed to get invite by token", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if invite.IsExpired() {
		return nil, errs.ErrInviteExpired
	}

	if !invite.HasUsesRemaining() {
		return nil, errs.ErrInviteMaxUsesReached
	}

	contest, err := s.contestRepo.GetByID(ctx, invite.ContestID)
	if err != nil {
		log.Error("failed to get contest for invite preview", "contest_id", invite.ContestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved invite preview", "contest_id", contest.ID)
	return invitePreview(contest, invite), nil
}

func invitePreview(contest *model.Contest, invite *model.ContestInvite) *model.InvitePreviewResponse {
	preview := &model.InvitePreviewResponse{
		ContestID:    contest.ID,
		ContestName:  contest.Name,
		Owner:        contest.Owner,
		Role:         string(invite.Role),
		MaxSquares:   invite.MaxSquares,
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

func (s *inviteService) RedeemInvite(ctx context.Context, token, user string) (*model.ContestParticipant, error) {
	log := logging.FromContext(ctx)

	invite, err := s.inviteRepo.GetByToken(ctx, token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrInviteNotFound
		}
		log.Error("failed to get invite by token", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if invite.IsExpired() {
		log.Warn("attempted to redeem expired invite", "invite_id", invite.ID)
		return nil, errs.ErrInviteExpired
	}

	if !invite.HasUsesRemaining() {
		log.Warn("attempted to redeem invite with no uses remaining", "invite_id", invite.ID)
		return nil, errs.ErrInviteMaxUsesReached
	}

	contest, err := s.contestRepo.GetByID(ctx, invite.ContestID)
	if err != nil {
		log.Error("failed to get contest for invite redemption", "contest_id", invite.ContestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot redeem invite for contest in terminal state", "contest_id", invite.ContestID, "status", contest.Status)
		return nil, errs.ErrContestFinalized
	}

	_, err = s.participantRepo.GetByContestAndUser(ctx, invite.ContestID, user)
	if err == nil {
		log.Warn("user already a participant", "contest_id", invite.ContestID, "user", user)
		return nil, errs.ErrAlreadyParticipant
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Error("failed to check existing participant", "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	totalAllocated, err := s.participantRepo.GetTotalAllocatedSquares(ctx, invite.ContestID)
	if err != nil {
		log.Error("failed to get total allocated squares", "contest_id", invite.ContestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	if totalAllocated+invite.MaxSquares > model.MaxContestSquares {
		log.Warn("not enough squares remaining", "contest_id", invite.ContestID, "allocated", totalAllocated, "requested", invite.MaxSquares)
		return nil, errs.ErrNotEnoughSquares
	}

	participant := &model.ContestParticipant{
		ContestID:  invite.ContestID,
		UserID:     user,
		Role:       invite.Role,
		MaxSquares: invite.MaxSquares,
		InviteID:   &invite.ID,
	}

	// the repository re-checks the pool, uses, and duplicate joins atomically, so it is the authority
	err = s.tx.Do(ctx, func(ctx context.Context) error {
		if redeemErr := s.inviteRepo.RedeemInvite(ctx, invite.ID, participant, model.MaxContestSquares); redeemErr != nil {
			return redeemErr
		}

		return s.events.PublishParticipantAdded(ctx, invite.ContestID, participant)
	})
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrNotEnoughSquares):
			log.Warn("contest pool filled before redemption committed", "contest_id", invite.ContestID, "user", user)
			return nil, err
		case errors.Is(err, errs.ErrInviteMaxUsesReached):
			log.Warn("invite uses exhausted before redemption committed", "invite_id", invite.ID, "user", user)
			return nil, err
		case errors.Is(err, gorm.ErrDuplicatedKey):
			log.Warn("user joined contest concurrently", "contest_id", invite.ContestID, "user", user)
			return nil, errs.ErrAlreadyParticipant
		}

		log.Error("failed to redeem invite", "invite_id", invite.ID, "contest_id", invite.ContestID, "user", user, "error", err)
		return nil, err
	}

	metrics.IncInviteRedeemed()
	metrics.IncParticipantJoined(string(invite.Role))

	log.Info("invite redeemed", "invite_id", invite.ID, "contest_id", invite.ContestID, "user", user)
	return participant, nil
}

func (s *inviteService) GetInvitesByContestID(ctx context.Context, contestID uuid.UUID, user string) ([]model.ContestInvite, error) {
	log := logging.FromContext(ctx)

	if err := s.participantService.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
		return nil, err
	}

	invites, err := s.inviteRepo.GetAllByContestID(ctx, contestID)
	if err != nil {
		log.Error("failed to get invites", "contest_id", contestID, "error", err)
		return nil, errs.ErrDatabaseUnavailable
	}

	log.Info("retrieved invites by contest", "contest_id", contestID, "count", len(invites))
	return invites, nil
}

func (s *inviteService) DeleteInvite(ctx context.Context, contestID, inviteID uuid.UUID, user string) error {
	log := logging.FromContext(ctx)

	contest, err := s.contestRepo.GetByID(ctx, contestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		log.Error("failed to get contest", "contest_id", contestID, "error", err)
		return errs.ErrDatabaseUnavailable
	}

	if contest.Status.IsTerminal() {
		log.Warn("cannot delete invite for contest in terminal state", "contest_id", contestID, "status", contest.Status)
		return errs.ErrContestFinalized
	}

	if err := s.participantService.Authorize(ctx, contestID, user, ActionManageInvites); err != nil {
		return err
	}

	if err := s.inviteRepo.Delete(ctx, inviteID); err != nil {
		log.Error("failed to delete invite", "invite_id", inviteID, "error", err)
		return err
	}

	log.Info("invite deleted", "invite_id", inviteID, "contest_id", contestID)
	return nil
}
