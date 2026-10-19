package smoke

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/maxmorhardt/maxhq/libs/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSmoke(t *testing.T) {
	ctx := context.Background()
	pg, err := testkit.StartPostgres(ctx)
	require.NoError(t, err)
	t.Cleanup(pg.Terminate)
	rd, err := testkit.StartRedis(ctx)
	require.NoError(t, err)
	t.Cleanup(rd.Terminate)

	env := append(pg.Env(), "REDIS_URL="+rd.Config.URL, "SCORES_ENABLED=false")

	svc := testkit.StartBinary(t, "../..", "./cmd/games", env)

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
		assert.Equal(t, "UP", ready.Checks["database"])
	})

	t.Run("serves its api reference", func(t *testing.T) {
		resp := testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/swagger/doc.json", nil)
		require.Equal(t, http.StatusOK, resp.Status)
		var spec struct {
			Paths map[string]json.RawMessage `json:"paths"`
		}
		resp.Decode(t, &spec)
		assert.Contains(t, spec.Paths, "/games/upcoming")
	})

	t.Run("rejects requests without the gateway's identity", func(t *testing.T) {
		assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, svc.URL, testkit.Anonymous, http.MethodGet, "/games/upcoming", nil).Status)
	})
}
