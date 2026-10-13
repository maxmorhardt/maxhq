package errs

import "errors"

var (
	ErrDatabaseUnavailable   = errors.New("service temporarily unavailable, please try again later")
	ErrDependencyFailed      = errors.New("a dependent service is unavailable, please try again later")
	ErrUserNotFound          = errors.New("user not found")
	ErrAccountActiveContests = errors.New("you must delete or leave your active contests before deleting your account")
	ErrInvalidRequestBody    = errors.New("invalid request body")
)

// captcha and email notification errors
var (
	ErrInvalidTurnstile      = errors.New("invalid or expired captcha")
	ErrTurnstileVerification = errors.New("failed to verify turnstile token")
	ErrEmailNotification     = errors.New("failed to send contact email notification")
)
