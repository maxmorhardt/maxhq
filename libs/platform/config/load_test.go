package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type testConfig struct {
	Server   ServerConfig
	DB       DatabaseConfig
	Redis    RedisConfig
	Streams  StreamsConfig
	Internal InternalConfig
}

func setEnv(t *testing.T) {
	t.Helper()
	for k, v := range map[string]string{
		"DB_HOST":            "localhost",
		"DB_PORT":            "5432",
		"DB_USER":            "testuser",
		"DB_PASSWORD":        "testpass",
		"DB_NAME":            "testdb",
		"DB_SSL_MODE":        "disable",
		"REDIS_URL":          "redis://localhost:6379/0",
		"INTERNAL_API_TOKEN": "internal",
	} {
		t.Setenv(k, v)
	}
}

func TestLoad_AppliesDefaults(t *testing.T) {
	setEnv(t)

	cfg, err := Load[testConfig]()

	require.NoError(t, err)
	assert.Equal(t, "localhost", cfg.DB.Host)
	assert.Equal(t, 5432, cfg.DB.Port)
	assert.Equal(t, "redis://localhost:6379/0", cfg.Redis.URL)
	assert.Equal(t, 168*time.Hour, cfg.Streams.Retention)
	assert.Equal(t, "internal", cfg.Internal.Token)
	assert.Empty(t, cfg.Server.Host)
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, 9090, cfg.Server.MetricsPort)
	assert.False(t, cfg.Server.MetricsEnabled)
	assert.Equal(t, []string{"http://localhost:3000"}, cfg.Server.AllowedOrigins)
}

func TestLoad_FailsOnMissingRequiredSettings(t *testing.T) {
	t.Setenv("REDIS_URL", "redis://localhost:6379/0")

	_, err := Load[testConfig]()

	require.Error(t, err)
	assert.Contains(t, err.Error(), "DB_HOST")
}

func TestLoad_SplitsAllowedOrigins(t *testing.T) {
	setEnv(t)
	t.Setenv("ALLOWED_ORIGINS", "https://a.test,https://b.test")

	cfg, err := Load[testConfig]()

	require.NoError(t, err)
	assert.Equal(t, []string{"https://a.test", "https://b.test"}, cfg.Server.AllowedOrigins)
}
