package errs

import "errors"

var (
	ErrDatabaseUnavailable   = errors.New("service temporarily unavailable, please try again later")
	ErrDependencyFailed      = errors.New("a dependent service is unavailable, please try again later")
	ErrUserNotFound          = errors.New("user not found")
	ErrRestoreTooOld         = errors.New("sign in again to restore your account")
	ErrAccountActiveContests = errors.New("you must delete or leave your active contests before deleting your account")
	ErrInvalidRequestBody    = errors.New("invalid request body")
)

var (
	ErrInvalidTurnstile      = errors.New("invalid or expired captcha")
	ErrTurnstileVerification = errors.New("failed to verify turnstile token")
	ErrEmailNotification     = errors.New("failed to send contact email notification")
)
