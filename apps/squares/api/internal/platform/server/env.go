package server

import (
	"fmt"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

// T is one of the per-service config structs in model, so each binary only demands the env it uses
func LoadConfig[T any]() (*T, error) {
	_ = godotenv.Load()

	cfg := new(T)
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse configuration: %w", err)
	}

	return cfg, nil
}
