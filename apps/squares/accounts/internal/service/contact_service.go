package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	netmail "net/mail"
	"net/textproto"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/repository"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/mail"
)

// covers loading the submission and every send attempt
const (
	notifyTimeout  = 2 * time.Minute
	notifyAttempts = 3
)

type ContactService interface {
	SubmitContact(ctx context.Context, req *model.ContactRequest, ipAddress string) error
}

type contactService struct {
	repo         repository.ContactRepository
	mailer       mail.Client
	supportEmail string
	turnstile    model.TurnstileConfig
	retryDelay   time.Duration
}

func NewContactService(repo repository.ContactRepository, mailer mail.Client, supportEmail string, turnstileCfg model.TurnstileConfig, retryDelay time.Duration) ContactService {
	return &contactService{
		repo:         repo,
		mailer:       mailer,
		supportEmail: supportEmail,
		turnstile:    turnstileCfg,
		retryDelay:   retryDelay,
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
	msg, err := BuildContactEmail(submission)
	if err != nil {
		return fmt.Errorf("%w: %w", errs.ErrEmailNotification, err)
	}
	msg.To = s.supportEmail
	if addr, parseErr := netmail.ParseAddress(submission.Email); parseErr == nil {
		msg.ReplyTo = addr.String()
	}

	for attempt := 1; ; attempt++ {
		err = s.mailer.Send(ctx, msg)
		if err == nil || !worthRetrying(err) || attempt == notifyAttempts {
			break
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("%w: %w", errs.ErrEmailNotification, errors.Join(err, ctx.Err()))
		case <-time.After(s.retryDelay * time.Duration(attempt)):
		}
	}
	if err != nil {
		return fmt.Errorf("%w: %w", errs.ErrEmailNotification, err)
	}
	return nil
}

func worthRetrying(err error) bool {
	if !mail.Retryable(err) || errors.Is(err, mail.ErrNoTLS) {
		return false
	}
	var reply *textproto.Error
	return !errors.As(err, &reply) || reply.Code < 500
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
