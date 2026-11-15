package service

import (
	"context"
	"fmt"
	"net/http"
	netmail "net/mail"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/mail"
)

// covers loading the submission and the SMTP exchange
const notifyTimeout = 30 * time.Second

type ContactService interface {
	SubmitContact(ctx context.Context, req *model.ContactRequest, ipAddress string) error
}

type contactService struct {
	repo         repository.ContactRepository
	mailer       mail.Client
	supportEmail string
	turnstile    model.TurnstileConfig
}

func NewContactService(repo repository.ContactRepository, mailer mail.Client, supportEmail string, turnstileCfg model.TurnstileConfig) ContactService {
	return &contactService{
		repo:         repo,
		mailer:       mailer,
		supportEmail: supportEmail,
		turnstile:    turnstileCfg,
	}
}

func (s *contactService) SubmitContact(ctx context.Context, req *model.ContactRequest, ipAddress string) error {
	log := logging.FromContext(ctx)

	if err := s.validateTurnstile(ctx, req.TurnstileToken, ipAddress); err != nil {
		log.Error("turnstile validation failed", "error", err)
		return errs.ErrInvalidTurnstile
	}

	submission := &model.ContactSubmission{
		Name:      req.Name,
		Email:     req.Email,
		Subject:   req.Subject,
		Message:   req.Message,
		IPAddress: ipAddress,
		Status:    model.ContactStatusPending,
	}

	if err := s.repo.Create(ctx, submission); err != nil {
		log.Error("failed to save contact submission to database", "error", err)
		return err
	}

	log.Info("contact submission saved to database", "submission_id", submission.ID)

	// the request may finish first, so the notification runs on a context that outlives it
	notifyCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), notifyTimeout)
	go func() {
		defer cancel()
		s.notify(notifyCtx, submission.ID)
	}()

	return nil
}

func (s *contactService) notify(ctx context.Context, submissionID uuid.UUID) {
	log := logging.FromContext(ctx).With("submission_id", submissionID)

	// the email is built from the stored row, so it shows exactly what was saved
	submission, err := s.repo.GetByID(ctx, submissionID)
	if err != nil {
		log.Error("failed to load contact submission for the email notification", "error", err)
		return
	}

	if err := s.sendEmailNotification(ctx, submission); err != nil {
		log.Error("failed to send contact email notification", "error", err)
		return
	}
	log.Info("contact email notification sent")
}

func (s *contactService) sendEmailNotification(ctx context.Context, submission *model.ContactSubmission) error {
	content, err := BuildContactEmail(submission)
	if err != nil {
		return fmt.Errorf("%w: %w", errs.ErrEmailNotification, err)
	}

	msg := &mail.Message{To: s.supportEmail, Subject: content.Subject, Text: content.Text, HTML: content.HTML}
	if addr, parseErr := netmail.ParseAddress(submission.Email); parseErr == nil {
		msg.ReplyTo = addr.String()
	}
	if err := s.mailer.Send(ctx, msg); err != nil {
		return fmt.Errorf("%w: %w", errs.ErrEmailNotification, err)
	}
	return nil
}

func (s *contactService) validateTurnstile(ctx context.Context, token, remoteIP string) error {
	baseURL := s.turnstile.BaseURL
	if baseURL == "" {
		baseURL = "https://challenges.cloudflare.com"
	}

	client := resty.New().
		SetTimeout(10 * time.Second).
		SetBaseURL(baseURL).
		SetRetryCount(2).
		SetRetryWaitTime(200 * time.Millisecond).
		SetRetryMaxWaitTime(1 * time.Second).
		AddRetryCondition(func(r *resty.Response, err error) bool {
			if ctx.Err() != nil {
				return false
			}
			if err != nil {
				return true
			}
			return r.StatusCode() >= http.StatusInternalServerError
		})

	var turnstileResp model.TurnstileResponse
	resp, err := client.R().
		SetContext(ctx).
		SetFormData(map[string]string{
			"secret":   s.turnstile.SecretKey,
			"response": token,
			"remoteip": remoteIP,
		}).
		SetResult(&turnstileResp).
		Post("/turnstile/v0/siteverify")

	if err != nil {
		return fmt.Errorf("%w: %w", errs.ErrTurnstileVerification, err)
	}

	if !resp.IsSuccess() {
		return fmt.Errorf("%w: status %d", errs.ErrTurnstileVerification, resp.StatusCode())
	}

	if !turnstileResp.Success {
		return fmt.Errorf("%w: %v", errs.ErrInvalidTurnstile, turnstileResp.ErrorCodes)
	}

	return nil
}
