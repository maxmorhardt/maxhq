package testkit

import (
	"bytes"
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"sync"
	"testing"
	"time"
)

type Process struct {
	URL string
	cmd *exec.Cmd
}

func StartBinary(t *testing.T, moduleDir, pkg string, env []string) *Process {
	t.Helper()

	exe := filepath.Join(t.TempDir(), "service")
	if runtime.GOOS == "windows" {
		exe += ".exe"
	}
	build := exec.CommandContext(context.Background(), "go", "build", "-o", exe, pkg) //nolint:gosec // test helper; pkg comes from the calling test
	build.Dir = moduleDir
	build.Env = append(os.Environ(), "GOWORK=off")
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build %s: %v\n%s", pkg, err, out)
	}

	port, err := freePort()
	if err != nil {
		t.Fatal(err)
	}

	log := &syncBuffer{}
	cmd := exec.CommandContext(context.Background(), exe) //nolint:gosec // the binary this helper just built
	// run outside the module so a developer's .env is never picked up
	cmd.Dir = t.TempDir()
	cmd.Env = append(append([]string{}, env...), "SERVER_HOST=127.0.0.1", "SERVER_PORT="+strconv.Itoa(port), "GIN_MODE=release")
	cmd.Stdout = log
	cmd.Stderr = log
	if err := cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", pkg, err)
	}

	p := &Process{URL: "http://127.0.0.1:" + strconv.Itoa(port), cmd: cmd}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
		if t.Failed() {
			t.Logf("service output:\n%s", log.String())
		}
	})

	if err := waitReady(p.URL, 60*time.Second); err != nil {
		t.Fatalf("%v\nservice output:\n%s", err, log.String())
	}
	return p
}

func waitReady(url string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url+"/health/ready", http.NoBody)
		if err != nil {
			return err
		}
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("service at %s never became ready", url)
}

func freePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer func() { _ = l.Close() }()
	return l.Addr().(*net.TCPAddr).Port, nil
}

func (p *Postgres) Env() []string {
	return []string{
		"DB_HOST=" + p.Config.Host,
		"DB_PORT=" + strconv.Itoa(p.Config.Port),
		"DB_USER=" + p.Config.User,
		"DB_PASSWORD=" + p.Config.Password,
		"DB_NAME=" + p.Config.Name,
		"DB_SSL_MODE=" + p.Config.SSLMode,
	}
}

type syncBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *syncBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *syncBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}
