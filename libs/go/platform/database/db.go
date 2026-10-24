package database

import (
	"fmt"
	"io/fs"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/plugin/dbresolver"
)

const (
	maxConnLifetime    = time.Hour
	slowQueryThreshold = time.Second
)

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

	// dbresolver copies this config when it opens the replica, which must not fail startup when unreachable
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true, Logger: newLogger(), DisableAutomaticPing: true})
	if err != nil {
		return nil, fmt.Errorf("failed to open primary database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("failed to connect to primary database: %w", err)
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

	pgxCfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse read replica config: %w", err)
	}
	replica := stdlib.OpenDB(*pgxCfg)

	primary, err := db.DB()
	if err != nil {
		_ = replica.Close()
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// db_name must differ from the primary's or the registration is rejected as a duplicate
	if err := prometheus.Register(collectors.NewDBStatsCollector(replica, cfg.ReadName+"-replica")); err != nil {
		slog.Warn("failed to register read replica stats collector", "error", err)
	}

	monitor := newReplicaMonitor(replica)
	resolver := dbresolver.Register(dbresolver.Config{
		Replicas: []gorm.Dialector{
			postgres.New(postgres.Config{Conn: replica}),
			postgres.New(postgres.Config{Conn: primary}),
		},
		Policy: monitor,
	})

	resolver.SetConnMaxIdleTime(maxConnLifetime)
	resolver.SetConnMaxLifetime(maxConnLifetime)
	resolver.SetMaxIdleConns(cfg.MaxIdleConns)
	resolver.SetMaxOpenConns(cfg.MaxOpenConns)

	if err := db.Use(resolver); err != nil {
		_ = replica.Close()
		return fmt.Errorf("failed to register read replica: %w", err)
	}
	if err := db.Use(monitor); err != nil {
		_ = replica.Close()
		return fmt.Errorf("failed to register read replica monitor: %w", err)
	}

	if err := monitor.check(); err != nil {
		slog.Warn("read replica is unavailable, starting anyway; reads go to the primary until it returns", "schema", schema, "error", err)
	} else {
		slog.Info("read replica configured", "schema", schema)
	}
	go monitor.run()

	return nil
}

func Close(db *gorm.DB) {
	if db != nil {
		closeDB(db)
	}
}

func closeDB(db *gorm.DB) {
	if monitor, ok := db.Plugins[replicaMonitorName].(*replicaMonitor); ok {
		monitor.close()
	}
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}
}
