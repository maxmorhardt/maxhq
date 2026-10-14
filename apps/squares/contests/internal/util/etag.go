package util

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var ErrInvalidIfMatch = errors.New("if-match must be a single contest version")

func SetETag(c *gin.Context, version int64) {
	c.Header("ETag", strconv.Quote(strconv.FormatInt(version, 10)))
}

// accepts "3", W/"3", or 3; no header or * means the client did not ask for a precondition
func ParseIfMatch(header string) (*int64, error) {
	header = strings.TrimSpace(header)
	if header == "" || header == "*" {
		return nil, nil
	}

	header = strings.TrimPrefix(header, "W/")
	header = strings.Trim(header, `"`)

	version, err := strconv.ParseInt(header, 10, 64)
	if err != nil || version < 1 {
		return nil, ErrInvalidIfMatch
	}

	return &version, nil
}
