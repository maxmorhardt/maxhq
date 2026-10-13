package server

import (
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/maxmorhardt/maxstash/libs/go/platform/cache"
	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConnect_RedisOnly(t *testing.T) {
	mr := miniredis.RunT(t)

	infra, err := Connect(&InfraConfig{Redis: config.RedisConfig{URL: "redis://" + mr.Addr() + "/0"}, KeyPrefix: "app-test"})

	require.NoError(t, err)
	t.Cleanup(infra.Close)
	assert.Nil(t, infra.DB)
	assert.NotNil(t, infra.Redis)
	assert.Equal(t, "app-test:x", cache.Key("x"), "the key prefix is applied")
	cache.SetKeyPrefix("app")
}

func TestConnect_RequiredRedisMustBeReachable(t *testing.T) {
	_, err := Connect(&InfraConfig{Redis: config.RedisConfig{URL: "redis://127.0.0.1:1/0"}})

	assert.ErrorContains(t, err, "failed to connect to redis")
}

func TestConnect_OptionalRedisMayStartDown(t *testing.T) {
	infra, err := Connect(&InfraConfig{Redis: config.RedisConfig{URL: "redis://127.0.0.1:1/0"}, RedisOptional: true})

	require.NoError(t, err)
	t.Cleanup(infra.Close)
	assert.NotNil(t, infra.Redis, "the client reconnects once redis is back")
}

func TestConnect_RejectsABadRedisURL(t *testing.T) {
	_, err := Connect(&InfraConfig{Redis: config.RedisConfig{URL: "not a url"}, RedisOptional: true})

	assert.ErrorContains(t, err, "failed to parse REDIS_URL")
}
