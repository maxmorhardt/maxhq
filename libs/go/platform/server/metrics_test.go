package server

import (
	"context"
	"testing"

	"github.com/maxmorhardt/maxstash/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStartMetricsServer_Disabled(t *testing.T) {
	assert.Nil(t, StartMetricsServer(config.ServerConfig{}))
}

func TestStartMetricsServer_Enabled(t *testing.T) {
	srv := StartMetricsServer(config.ServerConfig{MetricsEnabled: true, MetricsPort: 0})

	require.NotNil(t, srv)
	assert.Equal(t, ":0", srv.Addr)
	assert.NoError(t, srv.Shutdown(context.Background()))
}
