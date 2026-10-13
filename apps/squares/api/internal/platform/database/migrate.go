package database

import (
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"net"
	"net/url"
	"strconv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
)

// migrations is an fs whose root holds the NNNNNN_name.up/down.sql files for one service
func runMigrations(cfg *model.DatabaseConfig, schema string, migrations fs.FS) error {
	src, err := iofs.New(migrations, ".")
	if err != nil {
		return fmt.Errorf("failed to load embedded migrations: %w", err)
	}

	// own connection (not gorm's pool), so the deferred m.Close is safe
	m, err := migrate.NewWithSourceInstance("iofs", src, migrationDatabaseURL(cfg, schema))
	if err != nil {
		_ = src.Close()
		return fmt.Errorf("failed to initialize migrator: %w", err)
	}
	defer func() {
		if srcErr, dbErr := m.Close(); srcErr != nil || dbErr != nil {
			slog.Warn("failed to close migrator", "source_error", srcErr, "db_error", dbErr)
		}
	}()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			version, _, _ := m.Version()
			slog.Info("database schema already up to date", "schema", schema, "version", version)
			return nil
		}
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	version, _, _ := m.Version()
	slog.Info("database schema migrations applied", "schema", schema, "version", version)
	return nil
}

// search_path scopes both the migrated tables and migrate's own version table to the service schema
func migrationDatabaseURL(cfg *model.DatabaseConfig, schema string) string {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
		Path:   "/" + cfg.Name,
	}
	q := u.Query()
	q.Set("sslmode", cfg.SSLMode)
	q.Set("search_path", schema)
	q.Set("x-migrations-table", "schema_migrations")
	u.RawQuery = q.Encode()
	return u.String()
}
