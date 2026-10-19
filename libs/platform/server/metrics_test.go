package server

import (
	"context"
	"testing"

	"github.com/maxmorhardt/maxhq/libs/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStartMetricsServer_Disabled(t *testing.T) {
	assert.Nil(t, StartMetricsServer(config.ServerConfig{}))
}

func TestStartMetricsServer_Enabled(t *testing.T) {
	srv := StartMetricsServer(config.ServerConfig{Host: "127.0.0.1", MetricsEnabled: true, MetricsPort: 0})

	require.NotNil(t, srv)
	assert.Equal(t, "127.0.0.1:0", srv.Addr)
	assert.NoError(t, srv.Shutdown(context.Background()))
}
