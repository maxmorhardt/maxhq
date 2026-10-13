// Package config holds the environment settings every service shares and loads a service's config struct from the environment.
package config

import (
	"time"
)

type ServerConfig struct {
	Port           int      `env:"SERVER_PORT" envDefault:"8080"`
	MetricsEnabled bool     `env:"METRICS_ENABLED" envDefault:"false"`
	MetricsPort    int      `env:"METRICS_PORT" envDefault:"9090"`
	AllowedOrigins []string `env:"ALLOWED_ORIGINS" envDefault:"http://localhost:3000" envSeparator:","`
}

type DatabaseConfig struct {
	Host         string `env:"DB_HOST,required"`
	Port         int    `env:"DB_PORT,required"`
	User         string `env:"DB_USER,required"`
	Password     string `env:"DB_PASSWORD,required"`
	Name         string `env:"DB_NAME,required"`
	SSLMode      string `env:"DB_SSL_MODE,required"`
	ReadHost     string `env:"DB_READ_HOST"`
	ReadPort     int    `env:"DB_READ_PORT"`
	ReadUser     string `env:"DB_READ_USER"`
	ReadPassword string `env:"DB_READ_PASSWORD"`
	ReadName     string `env:"DB_READ_NAME"`
	ReadSSLMode  string `env:"DB_READ_SSL_MODE"`
}

type RedisConfig struct {
	URL string `env:"REDIS_URL,required"`
}

// event streams live in redis; entries older than Retention are trimmed as new ones arrive
type StreamsConfig struct {
	Retention time.Duration `env:"STREAM_RETENTION" envDefault:"168h"`
}

// service-to-service calls never leave the cluster and carry a shared token on top of the network policy
type InternalConfig struct {
	Token string `env:"INTERNAL_API_TOKEN,required"`
}
