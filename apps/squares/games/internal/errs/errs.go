package errs

import "errors"

var ErrDatabaseUnavailable = errors.New("service temporarily unavailable, please try again later")
