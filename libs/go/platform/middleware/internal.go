package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/go/platform/api"
	"github.com/maxmorhardt/maxstash/libs/go/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/go/platform/reqctx"
)

const HeaderInternalToken = "X-Internal-Token"

// guards /internal routes; they are never routed by the gateway and network policy limits who can reach them
func RequireInternalToken(token string) gin.HandlerFunc {
	expected := []byte(token)

	return func(c *gin.Context) {
		got := []byte(c.GetHeader(HeaderInternalToken))
		if len(expected) == 0 || subtle.ConstantTimeCompare(got, expected) != 1 {
			reqctx.LoggerFromGinContext(c).Warn("rejecting internal request with a bad token")
			metrics.RecordAuthFailure(api.AuthFailureInternalToken)
			c.AbortWithStatusJSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, "Unauthorized", c))
			return
		}

		c.Next()
	}
}
