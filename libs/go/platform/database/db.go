package database

import (
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	maxConnLifetime    = time.Hour
	slowQueryThreshold = time.Second
)

func InitDB(cfg *config.DatabaseConfig, schema string, migrations fs.FS) (*gorm.DB, error) {
	dsn := formatDSN(cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode, schema)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true, Logger: newLogger(), DisableAutomaticPing: true})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// the schema must exist before golang-migrate can create its version table inside it
	if err := db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %q", schema)).Error; err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("failed to create schema %s: %w", schema, err)
	}

	if migErr := runMigrations(cfg, schema, migrations); migErr != nil {
		_ = sqlDB.Close()
		return nil, migErr
	}

	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(maxConnLifetime)

	if err := prometheus.Register(collectors.NewDBStatsCollector(sqlDB, cfg.Name)); err != nil {
		slog.Warn("failed to register db stats collector", "error", err)
	}

	slog.Info("database configured", "schema", schema)
	return db, nil
}

// not-found is an expected result for lookups, and parameterized SQL keeps values out of the logs
func newLogger() logger.Interface {
	return logger.NewSlogLogger(slog.Default(), logger.Config{
		LogLevel:                  logger.Warn,
		SlowThreshold:             slowQueryThreshold,
		IgnoreRecordNotFoundError: true,
		ParameterizedQueries:      true,
	})
}

func formatDSN(host string, port int, user, password, dbname, sslmode, schema string) string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s search_path=%s",
		host, port, user, password, dbname, sslmode, schema,
	)
}

func Close(db *gorm.DB) {
	if db != nil {
		closeDB(db)
	}
}

func closeDB(db *gorm.DB) {
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}
}
