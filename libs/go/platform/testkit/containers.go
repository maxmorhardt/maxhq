package testkit

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // registers the pgx driver for the raw *sql.DB
	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	PostgresImage = "postgres:17-alpine"
	RedisImage    = "valkey/valkey:9.1-alpine"

	postgresDB       = "squares"
	postgresUser     = "test_user"
	postgresPassword = "test_password"
)

type Postgres struct {
	Config    config.DatabaseConfig
	DB        *sql.DB
	container testcontainers.Container
}

func (p *Postgres) Terminate() {
	if p.DB != nil {
		_ = p.DB.Close()
	}
	if p.container != nil {
		_ = p.container.Terminate(context.Background())
	}
}

func StartPostgres(ctx context.Context) (*Postgres, error) {
	container, err := postgres.Run(ctx,
		PostgresImage,
		postgres.WithDatabase(postgresDB),
		postgres.WithUsername(postgresUser),
		postgres.WithPassword(postgresPassword),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to start postgres: %w", err)
	}
	pg := &Postgres{container: container}

	host, err := container.Host(ctx)
	if err != nil {
		pg.Terminate()
		return nil, err
	}
	// localhost tries IPv6 first on Windows and stalls every new connection for a second
	if host == "localhost" {
		host = "127.0.0.1"
	}
	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		pg.Terminate()
		return nil, err
	}
	portNum, err := strconv.Atoi(port.Port())
	if err != nil {
		pg.Terminate()
		return nil, err
	}

	pg.Config = config.DatabaseConfig{Host: host, Port: portNum, User: postgresUser, Password: postgresPassword, Name: postgresDB, SSLMode: "disable"}
	pg.DB, err = sql.Open("pgx", fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, portNum, postgresUser, postgresPassword, postgresDB))
	if err != nil {
		pg.Terminate()
		return nil, err
	}

	return pg, nil
}

type Redis struct {
	Config    config.RedisConfig
	container testcontainers.Container
}

func (r *Redis) Terminate() {
	if r.container != nil {
		_ = r.container.Terminate(context.Background())
	}
}

func StartRedis(ctx context.Context) (*Redis, error) {
	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        RedisImage,
			ExposedPorts: []string{"6379/tcp"},
			WaitingFor:   wait.ForListeningPort("6379/tcp").WithStartupTimeout(30 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to start redis: %w", err)
	}
	r := &Redis{container: container}

	endpoint, err := container.PortEndpoint(ctx, "6379/tcp", "redis")
	if err != nil {
		r.Terminate()
		return nil, err
	}

	r.Config = config.RedisConfig{URL: endpoint + "/0"}
	return r, nil
}
