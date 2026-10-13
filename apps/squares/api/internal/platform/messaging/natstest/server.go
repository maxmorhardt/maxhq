// Package natstest runs an in-process NATS server with JetStream for unit tests.
package natstest

import (
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

func Run(t testing.TB) *nats.Conn {
	t.Helper()

	srv, err := server.NewServer(&server.Options{
		Host:      "127.0.0.1",
		Port:      -1,
		JetStream: true,
		StoreDir:  t.TempDir(),
		NoLog:     true,
		NoSigs:    true,
	})
	if err != nil {
		t.Fatalf("failed to create nats server: %v", err)
	}

	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("nats server did not become ready")
	}

	nc, err := nats.Connect(srv.ClientURL())
	if err != nil {
		t.Fatalf("failed to connect to nats server: %v", err)
	}

	t.Cleanup(func() {
		nc.Close()
		srv.Shutdown()
		srv.WaitForShutdown()
	})

	return nc
}

func URL(nc *nats.Conn) string {
	return nc.ConnectedUrl()
}
