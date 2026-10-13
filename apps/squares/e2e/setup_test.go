// Package e2e runs the four squares services as the real binaries, against one postgres seeded with the
// pre-split schema and one redis, and drives them over http the way the gateway and the browser do.
package e2e

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/libs/go/platform/testkit"
)

const (
	internalToken = "e2e-internal-token"
	eventually    = 20 * time.Second

	ownerUser  = "owner@squares.test"
	memberUser = "member@squares.test"
	legacyUser = "legacy@squares.test"
)

var (
	contestsURL string
	gamesURL    string
	accountsURL string
	realtimeURL string

	rawDB *sql.DB
	espn  = &fakeESPN{}

	// running services, stopped before the containers they depend on
	services []*service
)

type service struct {
	name string
	cmd  *exec.Cmd
	log  string
}

func TestMain(m *testing.M) {
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

	rd, err := testkit.StartRedis(ctx)
	if err != nil {
		slog.Error("redis", "error", err)
		return 1
	}
	defer rd.Terminate()

	// the monolith's tables, so every service has to adopt existing data on its first start
	if err = seedLegacySchema(); err != nil {
		slog.Error("legacy schema", "error", err)
		return 1
	}

	espnSrv := startESPN()
	defer espnSrv.Close()

	bin, err := os.MkdirTemp("", "squares-e2e-*")
	if err != nil {
		slog.Error("temp dir", "error", err)
		return 1
	}
	defer func() { _ = os.RemoveAll(bin) }()
	defer stopServices()

	common := []string{
		"DB_HOST=" + pg.Config.Host,
		"DB_PORT=" + strconv.Itoa(pg.Config.Port),
		"DB_USER=" + pg.Config.User,
		"DB_PASSWORD=" + pg.Config.Password,
		"DB_NAME=" + pg.Config.Name,
		"DB_SSL_MODE=disable",
		"REDIS_URL=" + rd.Config.URL,
		"INTERNAL_API_TOKEN=" + internalToken,
		"GIN_MODE=release",
	}

	// a cold cutover could start them in any order; contests first is the hardest, since users and games still sit in public
	contestsURL, err = startService(ctx, bin, "contests", common)
	if err != nil {
		slog.Error("contests", "error", err)
		dumpLogs()
		return 1
	}
	gamesURL, err = startService(ctx, bin, "games", append(common,
		"ESPN_BASE_URL="+espnSrv.URL, "SCORES_ACTIVE_INTERVAL=300ms", "SCORES_IDLE_INTERVAL=300ms"))
	if err != nil {
		slog.Error("games", "error", err)
		dumpLogs()
		return 1
	}
	accountsURL, err = startService(ctx, bin, "accounts", append(common,
		"CONTESTS_INTERNAL_URL="+contestsURL,
		"SMTP_HOST=127.0.0.1", "SMTP_PORT=1", "SMTP_USER=noreply@squares.test", "SMTP_PASSWORD=x", "SUPPORT_EMAIL=support@squares.test",
		"TURNSTILE_SECRET_KEY=unused", "TURNSTILE_BASE_URL=http://127.0.0.1:1"))
	if err != nil {
		slog.Error("accounts", "error", err)
		dumpLogs()
		return 1
	}
	realtimeURL, err = startService(ctx, bin, "realtime", append(common, "CONTESTS_INTERNAL_URL="+contestsURL))
	if err != nil {
		slog.Error("realtime", "error", err)
		dumpLogs()
		return 1
	}

	code := m.Run()
	if code != 0 {
		dumpLogs()
	}
	return code
}

func stopServices() {
	for _, s := range services {
		_ = s.cmd.Process.Kill()
		_ = s.cmd.Wait()
	}
}

// the services log to files so a passing run stays quiet; a failing one prints them
func dumpLogs() {
	for _, s := range services {
		raw, err := os.ReadFile(s.log)
		if err != nil {
			continue
		}
		fmt.Printf("\n===== %s =====\n%s\n", s.name, raw)
	}
}

// builds the service from its own module, starts it on a free port, and waits until it reports ready
func startService(ctx context.Context, bin, name string, env []string) (string, error) {
	exe := filepath.Join(bin, name)
	if runtime.GOOS == "windows" {
		exe += ".exe"
	}

	build := exec.CommandContext(ctx, "go", "build", "-o", exe, "./cmd/"+name)
	build.Dir = filepath.Join("..", name)
	build.Env = append(os.Environ(), "GOWORK=off")
	if out, err := build.CombinedOutput(); err != nil {
		return "", fmt.Errorf("build %s: %w\n%s", name, err, out)
	}

	port, err := freePort()
	if err != nil {
		return "", err
	}

	logPath := filepath.Join(bin, name+".log")
	logFile, err := os.Create(logPath)
	if err != nil {
		return "", err
	}
	defer func() { _ = logFile.Close() }()

	cmd := exec.Command(exe)
	// run outside the module so a developer's .env is never picked up
	cmd.Dir = bin
	cmd.Env = append(append([]string{}, env...), "SERVER_PORT="+strconv.Itoa(port), "METRICS_ENABLED=false")
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("start %s: %w", name, err)
	}
	services = append(services, &service{name: name, cmd: cmd, log: logPath})

	url := "http://127.0.0.1:" + strconv.Itoa(port)
	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := http.Get(url + "/health/ready") //nolint:noctx // readiness poll in test setup
		if err == nil {
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return url, nil
			}
		}
		time.Sleep(200 * time.Millisecond)
	}

	return "", fmt.Errorf("%s never became ready", name)
}

func freePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer func() { _ = l.Close() }()
	return l.Addr().(*net.TCPAddr).Port, nil
}
