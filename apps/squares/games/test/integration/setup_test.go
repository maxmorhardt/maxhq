package integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/bootstrap"
	"github.com/maxmorhardt/maxstash/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxstash/libs/platform/config"
	"github.com/maxmorhardt/maxstash/libs/platform/testkit"
	"github.com/redis/go-redis/v9"
)

const eventually = 20 * time.Second

var (
	gamesURL string
	rawDB    *sql.DB
	rdb      *redis.Client
	espn     = &fakeESPN{}
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(run(m))
}

func run(m *testing.M) int {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pg, err := testkit.StartPostgres(ctx)
	if err != nil {
		slog.Error("postgres", "error", err)
		return 1
	}
	defer pg.Terminate()
	rawDB = pg.DB

	legacy, err := os.ReadFile("testdata/legacy_schema.sql")
	if err != nil {
		slog.Error("legacy schema", "error", err)
		return 1
	}
	if _, err = rawDB.Exec(string(legacy)); err != nil {
		slog.Error("legacy schema", "error", err)
		return 1
	}

	rd, err := testkit.StartRedis(ctx)
	if err != nil {
		slog.Error("redis", "error", err)
		return 1
	}
	defer rd.Terminate()

	espnSrv := httptest.NewServer(espn)
	defer espnSrv.Close()

	cfg := &model.GamesConfig{
		Server:  config.ServerConfig{AllowedOrigins: []string{"http://localhost:3000"}},
		DB:      pg.Config,
		Redis:   rd.Config,
		Streams: config.StreamsConfig{Retention: time.Hour},
		Worker: model.WorkerConfig{
			Enabled:        true,
			ESPNBaseURL:    espnSrv.URL,
			ActiveInterval: 200 * time.Millisecond,
			IdleInterval:   200 * time.Millisecond,
			LockKey:        910011,
		},
	}
	infra, err := bootstrap.Connect(cfg)
	if err != nil {
		slog.Error("connect", "error", err)
		return 1
	}
	defer infra.Close()
	rdb = infra.Redis

	app := bootstrap.New(cfg, infra)
	app.Start(ctx)
	srv := httptest.NewServer(app.Engine)
	defer srv.Close()
	gamesURL = srv.URL

	return m.Run()
}

type fakeESPN struct {
	mu    sync.Mutex
	games []fakeGame
}

type fakeGame struct {
	ID       string
	Kickoff  time.Time
	State    string // pre, in, post
	Period   int
	Home     string
	Away     string
	HomeLine []int
	AwayLine []int
}

func (f *fakeESPN) set(games ...fakeGame) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.games = games
}

func (f *fakeESPN) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	type line struct {
		Value int `json:"value"`
	}
	competitor := func(side, name string, lines []int) map[string]any {
		total, ls := 0, make([]line, 0, len(lines))
		for _, v := range lines {
			total += v
			ls = append(ls, line{Value: v})
		}
		return map[string]any{
			"homeAway": side, "score": itoa(total), "linescores": ls,
			"team": map[string]string{"displayName": name, "abbreviation": name[:3]},
		}
	}

	events := make([]map[string]any, 0, len(f.games))
	for i := range f.games {
		g := &f.games[i]
		events = append(events, map[string]any{
			"id":     g.ID,
			"date":   g.Kickoff.UTC().Format("2006-01-02T15:04Z"),
			"season": map[string]int{"year": 2026, "type": 2},
			"week":   map[string]int{"number": 1},
			"competitions": []map[string]any{{
				"status": map[string]any{"period": g.Period, "type": map[string]any{"state": g.State, "completed": g.State == "post"}},
				"competitors": []map[string]any{
					competitor("home", g.Home, g.HomeLine),
					competitor("away", g.Away, g.AwayLine),
				},
			}},
		})
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"events": events})
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}
