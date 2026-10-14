package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// writes a 400 and reports false when the path parameter is not a UUID
func PathUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		label := "ID"
		if name != "id" {
			label = strings.TrimSuffix(name, "Id") + " ID"
		}
		c.JSON(http.StatusBadRequest, NewAPIError(http.StatusBadRequest, "Invalid "+label, c))
		return uuid.Nil, false
	}
	return id, true
}
