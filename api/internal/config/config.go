// Package config loads service configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"
)

// Config holds the runtime configuration of the API server.
type Config struct {
	// DatabaseURL is the PostgreSQL URL the API connects with, as the
	// writ_app role (DATABASE_URL, required). It contains a password and
	// must never be logged.
	DatabaseURL string
	// Port is the TCP port the HTTP server listens on (PORT, default 8080).
	Port int
	// LogLevel is the minimum level that is logged (LOG_LEVEL, default info).
	LogLevel slog.Level
	// ShutdownTimeout bounds how long in-flight requests may take to finish
	// after a shutdown signal (SHUTDOWN_TIMEOUT, default 15s).
	ShutdownTimeout time.Duration
}

// Addr returns the listen address for the HTTP server.
func (c Config) Addr() string {
	return ":" + strconv.Itoa(c.Port)
}

// Load reads the configuration using getenv, which has the signature of
// os.Getenv. Unset or empty variables fall back to their defaults. All
// invalid values are reported together.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		Port:            8080,
		LogLevel:        slog.LevelInfo,
		ShutdownTimeout: 15 * time.Second,
	}
	var errs []error

	cfg.DatabaseURL = strings.TrimSpace(getenv("DATABASE_URL"))
	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL: is required"))
	}

	if v := strings.TrimSpace(getenv("PORT")); v != "" {
		port, err := strconv.Atoi(v)
		if err != nil || port < 1 || port > 65535 {
			errs = append(errs, fmt.Errorf("PORT: %q is not a port number between 1 and 65535", v))
		} else {
			cfg.Port = port
		}
	}

	if v := strings.TrimSpace(getenv("LOG_LEVEL")); v != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(v)); err != nil {
			errs = append(errs, fmt.Errorf("LOG_LEVEL: %q is not one of debug, info, warn, error", v))
		}
	}

	if v := strings.TrimSpace(getenv("SHUTDOWN_TIMEOUT")); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d <= 0 {
			errs = append(errs, fmt.Errorf("SHUTDOWN_TIMEOUT: %q is not a positive duration such as 15s", v))
		} else {
			cfg.ShutdownTimeout = d
		}
	}

	if len(errs) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %w", errors.Join(errs...))
	}
	return cfg, nil
}
