package model

import "time"

type ContestsConfig struct {
	Server   ServerConfig
	DB       DatabaseConfig
	NATS     NATSConfig
	Redis    RedisConfig
	Internal InternalConfig
}

type GamesConfig struct {
	Server ServerConfig
	DB     DatabaseConfig
	NATS   NATSConfig
	Redis  RedisConfig
	Worker WorkerConfig
}

type AccountsConfig struct {
	Server    ServerConfig
	DB        DatabaseConfig
	NATS      NATSConfig
	Redis     RedisConfig
	Internal  InternalConfig
	SMTP      SMTPConfig
	Turnstile TurnstileConfig
	Contact   ContactConfig
}

type RealtimeConfig struct {
	Server   ServerConfig
	NATS     NATSConfig
	Redis    RedisConfig
	Internal InternalConfig
	Stream   StreamConfig
}

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

type NATSConfig struct {
	URL            string        `env:"NATS_URL,required"`
	StreamReplicas int           `env:"NATS_STREAM_REPLICAS" envDefault:"1"`
	StreamMaxAge   time.Duration `env:"NATS_STREAM_MAX_AGE" envDefault:"168h"`
}

type RedisConfig struct {
	URL string `env:"REDIS_URL,required"`
}

// service-to-service calls never leave the cluster and carry a shared token on top of the network policy
type InternalConfig struct {
	Token       string `env:"INTERNAL_API_TOKEN,required"`
	ContestsURL string `env:"CONTESTS_INTERNAL_URL" envDefault:"http://squares-contests:8080"`
}

type SMTPConfig struct {
	Host         string `env:"SMTP_HOST,required"`
	Port         int    `env:"SMTP_PORT,required"`
	User         string `env:"SMTP_USER,required"`
	Password     string `env:"SMTP_PASSWORD,required"`
	SupportEmail string `env:"SUPPORT_EMAIL,required"`
}

type TurnstileConfig struct {
	SecretKey string `env:"TURNSTILE_SECRET_KEY,required"`
	BaseURL   string `env:"TURNSTILE_BASE_URL" envDefault:"https://challenges.cloudflare.com"`
}

type ContactConfig struct {
	RateLimit int `env:"CONTACT_RATE_LIMIT" envDefault:"10"`
}

type WorkerConfig struct {
	Enabled        bool          `env:"SCORES_ENABLED" envDefault:"true"`
	ESPNBaseURL    string        `env:"ESPN_BASE_URL" envDefault:"https://site.api.espn.com"`
	ActiveInterval time.Duration `env:"SCORES_ACTIVE_INTERVAL" envDefault:"60s"`
	IdleInterval   time.Duration `env:"SCORES_IDLE_INTERVAL" envDefault:"6h"`
	LockKey        int64         `env:"SCORES_LOCK_KEY" envDefault:"910011"`
}

type StreamConfig struct {
	HeartbeatInterval  time.Duration `env:"SSE_HEARTBEAT_INTERVAL" envDefault:"25s"`
	RevocationInterval time.Duration `env:"SSE_REVOCATION_INTERVAL" envDefault:"5m"`
}
