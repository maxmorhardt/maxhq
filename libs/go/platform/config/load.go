package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// T is the service's own config struct, built from the pieces in this package plus its own settings
func Load[T any]() (*T, error) {
	_ = godotenv.Load()

	cfg := new(T)
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse configuration: %w", err)
	}

	return cfg, nil
}
