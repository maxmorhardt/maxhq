package api

import (
	"context"

	"github.com/gin-gonic/gin"
)

func ClaimsFromContext(ctx context.Context) *Claims {
	if claims, ok := ctx.Value(ClaimsKey).(*Claims); ok {
		return claims
	}
	return nil
}

func SetContextValue(c *gin.Context, key CTXKey, value any) {
	c.Set(key, value)
	c.Request = c.Request.WithContext(context.WithValue(c.Request.Context(), key, value))
}
