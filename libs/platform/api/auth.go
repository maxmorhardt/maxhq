package api

type Claims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Expire        int64  `json:"exp"`
	IssuedAt      int64  `json:"iat"`
}

type AuthFailureReason string

const (
	AuthFailureMissingHeader AuthFailureReason = "missing_header"
	AuthFailureUnverified    AuthFailureReason = "email_unverified"
	AuthFailureExpired       AuthFailureReason = "expired"
	AuthFailureRevoked       AuthFailureReason = "revoked"
	AuthFailureInternalToken AuthFailureReason = "internal_token"
)
