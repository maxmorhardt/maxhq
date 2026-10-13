package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/maxmorhardt/maxstash/libs/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
)

// envoy gateway validates the dex id token and copies these claims onto the request; the gateway strips any client-sent copies first
const (
	HeaderAuthEmail         = "X-Auth-Email"
	HeaderAuthName          = "X-Auth-Name"
	HeaderAuthEmailVerified = "X-Auth-Email-Verified"
	HeaderAuthIssuedAt      = "X-Auth-Iat"
	HeaderAuthExpiresAt     = "X-Auth-Exp"
)

const authErrorMessage = "Authentication required. Please log in to continue"

// trusts the gateway for signature, issuer, and audience; still enforces verification, expiry, and account deletion here
func Authenticate(revocations cache.RevocationStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, reason := claimsFromHeaders(c)
		if claims == nil {
			reqctx.LoggerFromGinContext(c).Warn("rejecting request without valid gateway identity", "reason", reason)
			metrics.RecordAuthFailure(reason)
			c.AbortWithStatusJSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, authErrorMessage, c))
			return
		}

		if revoked := isRevoked(c, revocations, claims); revoked {
			metrics.RecordAuthFailure(api.AuthFailureRevoked)
			c.AbortWithStatusJSON(http.StatusUnauthorized, api.NewAPIError(http.StatusUnauthorized, authErrorMessage, c))
			return
		}

		reqctx.SetGinContextValue(c, api.UserKey, claims.Email)
		reqctx.SetGinContextValue(c, api.ClaimsKey, claims)
		reqctx.SetGinContextValue(c, api.LoggerKey, reqctx.LoggerFromGinContext(c).With("user", claims.Email))

		c.Next()
	}
}

func claimsFromHeaders(c *gin.Context) (*api.Claims, api.AuthFailureReason) {
	email := c.GetHeader(HeaderAuthEmail)
	if email == "" {
		return nil, api.AuthFailureMissingHeader
	}

	verified, err := strconv.ParseBool(c.GetHeader(HeaderAuthEmailVerified))
	if err != nil || !verified {
		return nil, api.AuthFailureUnverified
	}

	// iat is required: revocation compares it against the deletion instant
	issuedAt, err := strconv.ParseInt(c.GetHeader(HeaderAuthIssuedAt), 10, 64)
	if err != nil || issuedAt <= 0 {
		return nil, api.AuthFailureMissingHeader
	}

	expiresAt, err := strconv.ParseInt(c.GetHeader(HeaderAuthExpiresAt), 10, 64)
	if err != nil || expiresAt <= time.Now().Unix() {
		return nil, api.AuthFailureExpired
	}

	name := c.GetHeader(HeaderAuthName)
	if name == "" {
		name = email
	}

	return &api.Claims{
		Email:         email,
		EmailVerified: true,
		Name:          name,
		IssuedAt:      issuedAt,
		Expire:        expiresAt,
	}, ""
}

// a redis outage fails open: deleted-account tokens are rare and short lived, an outage would otherwise reject everyone
func isRevoked(c *gin.Context, revocations cache.RevocationStore, claims *api.Claims) bool {
	if revocations == nil {
		return false
	}

	revoked, err := revocations.IsRevoked(c.Request.Context(), claims.Email, claims.IssuedAt)
	if err != nil {
		metrics.IncRedisError("revocation_check")
		reqctx.LoggerFromGinContext(c).Warn("revocation check failed, allowing request", "error", err)
		return false
	}

	if revoked {
		reqctx.LoggerFromGinContext(c).Warn("rejecting token issued before account deletion", "user", claims.Email)
	}

	return revoked
}
