package errs

import "errors"

var ErrGameNotFound = errors.New("game not found")

var ErrDatabaseUnavailable = errors.New("service temporarily unavailable, please try again later")
