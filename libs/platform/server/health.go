package server

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/libs/platform/api"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const checkTimeout = 3 * time.Second

type Check func(ctx context.Context) error

type HealthHandler interface {
	Liveness(c *gin.Context)
	Readiness(c *gin.Context)
}

type healthHandler struct {
	checks map[string]Check
}

// each service passes only the dependencies it actually needs to serve
func NewHealthHandler(checks map[string]Check) HealthHandler {
	return &healthHandler{checks: checks}
}

// Liveness godoc
// @Summary Liveness check
// @Description Returns UP if the service process is running
// @Tags health
// @Produce json
// @Success 200 {object} api.LivenessResponse
// @Router /health/live [get]
func (h *healthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, api.LivenessResponse{Status: "UP"})
}

// Readiness godoc
// @Summary Readiness check
// @Description Checks every dependency the service needs to serve traffic
// @Tags health
// @Produce json
// @Success 200 {object} api.ReadinessResponse
// @Failure 503 {object} api.ReadinessResponse
// @Router /health/ready [get]
func (h *healthHandler) Readiness(c *gin.Context) {
	resp := api.ReadinessResponse{Status: "UP", Checks: make(map[string]string, len(h.checks))}

	for name, check := range h.checks {
		ctx, cancel := context.WithTimeout(c.Request.Context(), checkTimeout)
		err := check(ctx)
		cancel()

		if err != nil {
			resp.Checks[name] = "DOWN"
			resp.Status = "DOWN"
			continue
		}
		resp.Checks[name] = "UP"
	}

	if resp.Status != "UP" {
		c.JSON(http.StatusServiceUnavailable, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

func DatabaseCheck(db *gorm.DB) Check {
	return func(ctx context.Context) error {
		if db == nil {
			return errors.New("database not configured")
		}
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.PingContext(ctx)
	}
}

func RedisCheck(client *redis.Client) Check {
	return func(ctx context.Context) error {
		if client == nil {
			return errors.New("redis not configured")
		}
		return client.Ping(ctx).Err()
	}
}
