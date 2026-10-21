package service_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/mocks"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestNewContactService(t *testing.T) {
	require.NotNil(t, service.NewContactService(nil, model.SMTPConfig{}, model.TurnstileConfig{}))
}

func TestContactService_SubmitContact_TurnstileValidationFails(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	svc := service.NewContactService(mocks.NewContactRepository(t), contactCfg().SMTP, contactCfg().Turnstile)

	err := svc.SubmitContact(ctx, contactReq(), "127.0.0.1")

	assert.ErrorIs(t, err, errs.ErrInvalidTurnstile)
}

func contactCfg() *model.AccountsConfig {
	cfg := &model.AccountsConfig{}
	cfg.Turnstile.SecretKey = "test-secret"
	cfg.SMTP.Host = "127.0.0.1"
	cfg.SMTP.Port = 1
	cfg.SMTP.User = "sender@example.com"
	cfg.SMTP.Password = "pass"
	cfg.SMTP.SupportEmail = "support@example.com"
	return cfg
}

func contactReq() *model.ContactRequest {
	return &model.ContactRequest{
		Name:           "Alice",
		Email:          "alice@example.com",
		Subject:        "Hello",
		Message:        "Test message",
		TurnstileToken: "token",
	}
}

func TestContactService_SubmitContact_TurnstileAPIReturnsFail(t *testing.T) {
	cfg := turnstileServer(t, http.StatusOK, `{"success":false,"error-codes":["invalid-input-response"]}`)

	svc := service.NewContactService(mocks.NewContactRepository(t), cfg.SMTP, cfg.Turnstile)

	err := svc.SubmitContact(context.Background(), contactReq(), "127.0.0.1")

	assert.ErrorIs(t, err, errs.ErrInvalidTurnstile)
}

func turnstileServer(t *testing.T, statusCode int, body string) *model.AccountsConfig {
	t.Helper()
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		fmt.Fprint(w, body)
	}))
	t.Cleanup(ts.Close)

	cfg := &model.AccountsConfig{}
	cfg.Turnstile.SecretKey = "test-secret"
	cfg.Turnstile.BaseURL = ts.URL
	cfg.SMTP.Host = "127.0.0.1"
	cfg.SMTP.Port = 1
	cfg.SMTP.User = "sender@example.com"
	cfg.SMTP.Password = "pass"
	cfg.SMTP.SupportEmail = "support@example.com"
	return cfg
}

func TestContactService_SubmitContact_TurnstileAPIStatusError(t *testing.T) {
	cfg := turnstileServer(t, http.StatusInternalServerError, `{}`)

	svc := service.NewContactService(mocks.NewContactRepository(t), cfg.SMTP, cfg.Turnstile)

	err := svc.SubmitContact(context.Background(), contactReq(), "127.0.0.1")

	assert.ErrorIs(t, err, errs.ErrInvalidTurnstile)
}

func TestContactService_SubmitContact_RepoCreateFails(t *testing.T) {
	cfg := turnstileServer(t, http.StatusOK, `{"success":true}`)

	repo := mocks.NewContactRepository(t)
	repo.EXPECT().Create(mock.Anything, mock.Anything).Return(errors.New("db error"))

	svc := service.NewContactService(repo, cfg.SMTP, cfg.Turnstile)

	err := svc.SubmitContact(context.Background(), contactReq(), "127.0.0.1")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "db error")
}

func TestContactService_SubmitContact_Success(t *testing.T) {
	cfg := turnstileServer(t, http.StatusOK, `{"success":true}`)

	saved := uuid.New()
	loaded := make(chan uuid.UUID, 1)
	repo := mocks.NewContactRepository(t)
	repo.EXPECT().Create(mock.Anything, mock.Anything).
		Run(func(_ context.Context, sub *model.ContactSubmission) { sub.ID = saved }).Return(nil)
	repo.EXPECT().GetByID(mock.Anything, saved).
		Run(func(_ context.Context, id uuid.UUID) { loaded <- id }).
		Return(&model.ContactSubmission{ID: saved, Email: "a@x.com"}, nil).Maybe()

	svc := service.NewContactService(repo, cfg.SMTP, cfg.Turnstile)

	err := svc.SubmitContact(context.Background(), contactReq(), "127.0.0.1")

	assert.NoError(t, err)
	select {
	case id := <-loaded:
		assert.Equal(t, saved, id, "the notification is built from the stored submission")
	case <-time.After(5 * time.Second):
		t.Fatal("the notification never loaded the submission")
	}
}

func TestContactService_SubmitContact_NotificationSkipsAMissingSubmission(t *testing.T) {
	cfg := turnstileServer(t, http.StatusOK, `{"success":true}`)

	loaded := make(chan struct{}, 1)
	repo := mocks.NewContactRepository(t)
	repo.EXPECT().Create(mock.Anything, mock.Anything).Return(nil)
	repo.EXPECT().GetByID(mock.Anything, mock.Anything).
		Run(func(context.Context, uuid.UUID) { loaded <- struct{}{} }).
		Return(nil, errors.New("gone")).Maybe()

	require.NoError(t, service.NewContactService(repo, cfg.SMTP, cfg.Turnstile).
		SubmitContact(context.Background(), contactReq(), "127.0.0.1"))

	select {
	case <-loaded:
	case <-time.After(5 * time.Second):
		t.Fatal("the notification never tried to load the submission")
	}
}
