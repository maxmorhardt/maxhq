package server

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/nats-io/nats.go"
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
// @Success 200 {object} model.LivenessResponse
// @Router /health/live [get]
func (h *healthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, model.LivenessResponse{Status: "UP"})
}

// Readiness godoc
// @Summary Readiness check
// @Description Checks every dependency the service needs to serve traffic
// @Tags health
// @Produce json
// @Success 200 {object} model.ReadinessResponse
// @Failure 503 {object} model.ReadinessResponse
// @Router /health/ready [get]
func (h *healthHandler) Readiness(c *gin.Context) {
	resp := model.ReadinessResponse{Status: "UP", Checks: make(map[string]string, len(h.checks))}

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

func NATSCheck(nc *nats.Conn) Check {
	return func(context.Context) error {
		if nc == nil || !nc.IsConnected() {
			return errors.New("nats not connected")
		}
		return nil
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
