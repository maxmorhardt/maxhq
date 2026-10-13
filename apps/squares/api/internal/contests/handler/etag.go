package handler

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var errInvalidIfMatch = errors.New("if-match must be a single contest version")

// contest versions are exposed as strong etags so clients can send them back in If-Match
func setETag(c *gin.Context, version int64) {
	c.Header("ETag", strconv.Quote(strconv.FormatInt(version, 10)))
}

// accepts "3", W/"3", or 3; no header or * means the client did not ask for a precondition
func parseIfMatch(header string) (*int64, error) {
	header = strings.TrimSpace(header)
	if header == "" || header == "*" {
		return nil, nil
	}

	header = strings.TrimPrefix(header, "W/")
	header = strings.Trim(header, `"`)

	version, err := strconv.ParseInt(header, 10, 64)
	if err != nil || version < 1 {
		return nil, errInvalidIfMatch
	}

	return &version, nil
}
