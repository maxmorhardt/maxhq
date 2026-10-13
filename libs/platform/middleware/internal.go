package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/logging"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
)

const HeaderInternalToken = "X-Internal-Token"

// guards /internal routes; they are never routed by the gateway and network policy limits who can reach them
func RequireInternalToken(token string) gin.HandlerFunc {
	expected := []byte(token)

	return func(c *gin.Context) {
		got := []byte(c.GetHeader(HeaderInternalToken))
		if len(expected) == 0 || subtle.ConstantTimeCompare(got, expected) != 1 {
			logging.FromGin(c).Warn("rejecting internal request with a bad token")
			metrics.RecordAuthFailure(api.AuthFailureInternalToken)
			c.AbortWithStatusJSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, "Unauthorized", c))
			return
		}

		c.Next()
	}
}
