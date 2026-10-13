package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

const HeaderInternalToken = "X-Internal-Token"

// guards /internal routes; they are never routed by the gateway and network policy limits who can reach them
func RequireInternalToken(token string) gin.HandlerFunc {
	expected := []byte(token)

	return func(c *gin.Context) {
		got := []byte(c.GetHeader(HeaderInternalToken))
		if len(expected) == 0 || subtle.ConstantTimeCompare(got, expected) != 1 {
			util.LoggerFromGinContext(c).Warn("rejecting internal request with a bad token")
			metrics.RecordAuthFailure(model.AuthFailureInternalToken)
			c.AbortWithStatusJSON(http.StatusUnauthorized, model.NewAPIError(http.StatusUnauthorized, "Unauthorized", c))
			return
		}

		c.Next()
	}
}
