package server

import (
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setCommonEnv(t *testing.T) {
	t.Helper()
	for k, v := range map[string]string{
		"DB_HOST":            "localhost",
		"DB_PORT":            "5432",
		"DB_USER":            "testuser",
		"DB_PASSWORD":        "testpass",
		"DB_NAME":            "testdb",
		"DB_SSL_MODE":        "disable",
		"NATS_URL":           "nats://localhost:4222",
		"REDIS_URL":          "redis://localhost:6379/0",
		"INTERNAL_API_TOKEN": "internal",
	} {
		t.Setenv(k, v)
	}
}

func TestLoadConfig_Contests(t *testing.T) {
	setCommonEnv(t)

	cfg, err := LoadConfig[model.ContestsConfig]()

	require.NoError(t, err)
	assert.Equal(t, "localhost", cfg.DB.Host)
	assert.Equal(t, 5432, cfg.DB.Port)
	assert.Equal(t, "nats://localhost:4222", cfg.NATS.URL)
	assert.Equal(t, 1, cfg.NATS.StreamReplicas)
	assert.Equal(t, 168*time.Hour, cfg.NATS.StreamMaxAge)
	assert.Equal(t, "redis://localhost:6379/0", cfg.Redis.URL)
	assert.Equal(t, "internal", cfg.Internal.Token)
	assert.Equal(t, "http://squares-contests:8080", cfg.Internal.ContestsURL)
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, 9090, cfg.Server.MetricsPort)
	assert.False(t, cfg.Server.MetricsEnabled)
}

func TestLoadConfig_AccountsRequiresSMTPAndTurnstile(t *testing.T) {
	setCommonEnv(t)

	_, err := LoadConfig[model.AccountsConfig]()
	require.Error(t, err)

	for k, v := range map[string]string{
		"SMTP_HOST":            "smtp.test.com",
		"SMTP_PORT":            "587",
		"SMTP_USER":            "smtpuser",
		"SMTP_PASSWORD":        "smtppass",
		"SUPPORT_EMAIL":        "support@test.com",
		"TURNSTILE_SECRET_KEY": "secret",
	} {
		t.Setenv(k, v)
	}

	cfg, err := LoadConfig[model.AccountsConfig]()
	require.NoError(t, err)
	assert.Equal(t, 10, cfg.Contact.RateLimit)
	assert.Equal(t, "https://challenges.cloudflare.com", cfg.Turnstile.BaseURL)
}

func TestLoadConfig_RealtimeNeedsNoDatabase(t *testing.T) {
	t.Setenv("NATS_URL", "nats://localhost:4222")
	t.Setenv("REDIS_URL", "redis://localhost:6379/0")
	t.Setenv("INTERNAL_API_TOKEN", "internal")

	cfg, err := LoadConfig[model.RealtimeConfig]()

	require.NoError(t, err)
	assert.Equal(t, 25*time.Second, cfg.Stream.HeartbeatInterval)
	assert.Equal(t, 5*time.Minute, cfg.Stream.RevocationInterval)
}

func TestLoadConfig_GamesWorkerDefaults(t *testing.T) {
	setCommonEnv(t)

	cfg, err := LoadConfig[model.GamesConfig]()

	require.NoError(t, err)
	assert.True(t, cfg.Worker.Enabled)
	assert.Equal(t, 60*time.Second, cfg.Worker.ActiveInterval)
	assert.Equal(t, int64(910011), cfg.Worker.LockKey)
}

func TestLoadConfig_MissingRequired(t *testing.T) {
	t.Setenv("NATS_URL", "")

	_, err := LoadConfig[model.ContestsConfig]()

	assert.ErrorContains(t, err, "failed to parse configuration")
}
