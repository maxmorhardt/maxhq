package errs

import "errors"

var (
	ErrContestNotFound  = errors.New("contest not found")
	ErrInsufficientRole = errors.New("insufficient permissions for this action")
	ErrDependencyFailed = errors.New("a dependent service is unavailable, please try again later")
)
