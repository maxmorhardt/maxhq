package smoke

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/maxmorhardt/maxstash/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSmoke(t *testing.T) {
	ctx := context.Background()
	rd, err := testkit.StartRedis(ctx)
	require.NoError(t, err)
	t.Cleanup(rd.Terminate)

	env := []string{"REDIS_URL=" + rd.Config.URL, "INTERNAL_API_TOKEN=smoke", "CONTESTS_INTERNAL_URL=http://127.0.0.1:1"}

	svc := testkit.StartBinary(t, "../..", "./cmd/realtime", env)

	t.Run("reports live and ready", func(t *testing.T) {
		assert.Equal(t, http.StatusOK, testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/health/live", nil).Status)

		resp := testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/health/ready", nil)
		require.Equal(t, http.StatusOK, resp.Status, string(resp.Body))
		var ready struct {
			Status string            `json:"status"`
			Checks map[string]string `json:"checks"`
		}
		resp.Decode(t, &ready)
		assert.Equal(t, "UP", ready.Status)
		assert.Equal(t, "UP", ready.Checks["redis"])
	})

	t.Run("serves its api reference", func(t *testing.T) {
		resp := testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/swagger/doc.json", nil)
		require.Equal(t, http.StatusOK, resp.Status)
		var spec struct {
			Paths map[string]json.RawMessage `json:"paths"`
		}
		resp.Decode(t, &spec)
		assert.Contains(t, spec.Paths, "/events/contests/{id}")
	})

	t.Run("rejects requests without the gateway's identity", func(t *testing.T) {
		assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/events/contests/00000000-0000-0000-0000-000000000000", nil).Status)
	})
}
