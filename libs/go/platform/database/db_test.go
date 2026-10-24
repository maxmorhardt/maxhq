package database

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"testing"
	"testing/fstest"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestInitDB_ConnectionError(t *testing.T) {
	cfg := config.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}

	db, err := InitDB(&cfg, "contests", fstest.MapFS{})

	require.Error(t, err)
	assert.Nil(t, db)
}

func TestFormatDSN(t *testing.T) {
	tests := []struct {
		name     string
		host     string
		port     int
		user     string
		password string
		dbname   string
		sslmode  string
		schema   string
		expected string
	}{
		{
			name:     "standard connection",
			host:     "localhost",
			port:     5432,
			user:     "admin",
			password: "secret",
			dbname:   "mydb",
			sslmode:  "disable",
			schema:   "contests",
			expected: "host=localhost port=5432 user=admin password=secret dbname=mydb sslmode=disable search_path=contests",
		},
		{
			name:     "remote host with ssl",
			host:     "db.example.com",
			port:     5433,
			user:     "app",
			password: "p@ss!",
			dbname:   "production",
			sslmode:  "require",
			schema:   "games",
			expected: "host=db.example.com port=5433 user=app password=p@ss! dbname=production sslmode=require search_path=games",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatDSN(tt.host, tt.port, tt.user, tt.password, tt.dbname, tt.sslmode, tt.schema)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateReadReplicaConfig(t *testing.T) {
	complete := config.DatabaseConfig{
		ReadHost:     "replica",
		ReadPort:     5432,
		ReadUser:     "reader",
		ReadPassword: "secret",
		ReadName:     "mydb",
		ReadSSLMode:  "require",
	}

	tests := []struct {
		name      string
		mutate    func(c *config.DatabaseConfig)
		wantErr   bool
		wantInMsg string
	}{
		{name: "complete config", mutate: func(*config.DatabaseConfig) {}, wantErr: false},
		{name: "missing port", mutate: func(c *config.DatabaseConfig) { c.ReadPort = 0 }, wantErr: true, wantInMsg: "DB_READ_PORT"},
		{name: "missing user", mutate: func(c *config.DatabaseConfig) { c.ReadUser = "" }, wantErr: true, wantInMsg: "DB_READ_USER"},
		{name: "missing password", mutate: func(c *config.DatabaseConfig) { c.ReadPassword = "" }, wantErr: true, wantInMsg: "DB_READ_PASSWORD"},
		{name: "missing name", mutate: func(c *config.DatabaseConfig) { c.ReadName = "" }, wantErr: true, wantInMsg: "DB_READ_NAME"},
		{name: "missing ssl mode", mutate: func(c *config.DatabaseConfig) { c.ReadSSLMode = "" }, wantErr: true, wantInMsg: "DB_READ_SSL_MODE"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbCfg := complete
			tt.mutate(&dbCfg)

			err := validateReadReplicaConfig(&dbCfg)

			if !tt.wantErr {
				assert.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantInMsg)
		})
	}
}

func TestClose_NilIsSafe(t *testing.T) {
	assert.NotPanics(t, func() { Close(nil) })
}

func TestNewLogger(t *testing.T) {
	tests := []struct {
		name    string
		elapsed time.Duration
		err     error
		logged  string
	}{
		{name: "fast query", elapsed: time.Millisecond},
		{name: "record not found", elapsed: time.Millisecond, err: gorm.ErrRecordNotFound},
		{name: "slow query", elapsed: 2 * slowQueryThreshold, logged: "WARN"},
		{name: "failed query", elapsed: time.Millisecond, err: errors.New("boom"), logged: "ERROR"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			prev := slog.Default()
			slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
			t.Cleanup(func() { slog.SetDefault(prev) })

			newLogger().Trace(context.Background(), time.Now().Add(-tt.elapsed), func() (string, int64) {
				return "SELECT * FROM contests WHERE id = $1", 1
			}, tt.err)

			if tt.logged == "" {
				assert.Empty(t, buf.String())
				return
			}
			assert.Contains(t, buf.String(), `"level":"`+tt.logged+`"`)
			assert.Contains(t, buf.String(), "id = $1")
		})
	}
}
