package database

import (
	"testing"
	"testing/fstest"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
)

func TestMigrationDatabaseURL(t *testing.T) {
	cfg := config.DatabaseConfig{
		Host:     "db.example.com",
		Port:     5432,
		User:     "user",
		Password: "p@ss word",
		Name:     "squares",
		SSLMode:  "require",
	}

	url := migrationDatabaseURL(&cfg, "contests")

	assert.Contains(t, url, "postgres://")
	assert.Contains(t, url, "db.example.com:5432")
	assert.Contains(t, url, "/squares")
	assert.Contains(t, url, "sslmode=require")
	assert.Contains(t, url, "search_path=contests")
	assert.Contains(t, url, "x-migrations-table=schema_migrations")
	assert.NotContains(t, url, "p@ss word", "credentials must be percent-encoded")
}

func TestRunMigrations_BadConnection(t *testing.T) {
	cfg := config.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}
	migrations := fstest.MapFS{"000001_init.up.sql": {Data: []byte("SELECT 1;")}}

	assert.Error(t, runMigrations(&cfg, "contests", migrations))
}

func TestRunMigrations_NoMigrations(t *testing.T) {
	cfg := config.DatabaseConfig{Host: "127.0.0.1", Port: 1, User: "u", Password: "p", Name: "n", SSLMode: "disable"}

	assert.Error(t, runMigrations(&cfg, "contests", fstest.MapFS{}))
}
