package database

import (
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/maxmorhardt/maxhq/libs/platform/config"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/plugin/dbresolver"
)

const maxConnLifetime = time.Hour

func InitDB(cfg *config.DatabaseConfig, schema string, migrations fs.FS) (*gorm.DB, error) {
	db, err := setupPrimary(cfg, schema, migrations)
	if err != nil {
		return nil, err
	}

	if cfg.ReadHost != "" {
		if err := validateReadReplicaConfig(cfg); err != nil {
			closeDB(db)
			return nil, err
		}
		if err := setupReadReplica(cfg, schema, db); err != nil {
			closeDB(db)
			return nil, err
		}
	}

	return db, nil
}

func setupPrimary(cfg *config.DatabaseConfig, schema string, migrations fs.FS) (*gorm.DB, error) {
	dsn := formatDSN(cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode, schema)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to primary database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
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

	slog.Info("primary database configured", "schema", schema)
	return db, nil
}

func formatDSN(host string, port int, user, password, dbname, sslmode, schema string) string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s search_path=%s",
		host, port, user, password, dbname, sslmode, schema,
	)
}

func validateReadReplicaConfig(cfg *config.DatabaseConfig) error {
	var missing []string

	if cfg.ReadPort == 0 {
		missing = append(missing, "DB_READ_PORT")
	}
	if cfg.ReadUser == "" {
		missing = append(missing, "DB_READ_USER")
	}
	if cfg.ReadPassword == "" {
		missing = append(missing, "DB_READ_PASSWORD")
	}
	if cfg.ReadName == "" {
		missing = append(missing, "DB_READ_NAME")
	}
	if cfg.ReadSSLMode == "" {
		missing = append(missing, "DB_READ_SSL_MODE")
	}

	if len(missing) > 0 {
		return fmt.Errorf("DB_READ_HOST is set but required read replica config is missing: %v", missing)
	}

	return nil
}

func setupReadReplica(cfg *config.DatabaseConfig, schema string, db *gorm.DB) error {
	dsn := formatDSN(cfg.ReadHost, cfg.ReadPort, cfg.ReadUser, cfg.ReadPassword, cfg.ReadName, cfg.ReadSSLMode, schema)

	resolver := dbresolver.Register(dbresolver.Config{
		Replicas:          []gorm.Dialector{postgres.Open(dsn)},
		Policy:            dbresolver.RandomPolicy{},
		TraceResolverMode: true,
	})

	resolver.SetConnMaxIdleTime(maxConnLifetime)
	resolver.SetConnMaxLifetime(maxConnLifetime)
	resolver.SetMaxIdleConns(cfg.MaxIdleConns)
	resolver.SetMaxOpenConns(cfg.MaxOpenConns)

	if err := db.Use(resolver); err != nil {
		return fmt.Errorf("failed to register read replica: %w", err)
	}

	slog.Info("read replica configured", "schema", schema)
	return nil
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
