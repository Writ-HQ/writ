// Package config loads service configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/Writ-HQ/writ/api/internal/auth"
)

// Config holds the runtime configuration of the API server.
type Config struct {
	// DatabaseURL is the PostgreSQL URL the API connects with, as the
	// writ_app role (DATABASE_URL, required). It contains a password and
	// must never be logged.
	DatabaseURL string
	// OIDCIssuer is the identity provider's issuer URL, which every access
	// token must name exactly in its iss claim (OIDC_ISSUER, required).
	OIDCIssuer string
	// OIDCAudience must be among each access token's aud values. With
	// Zitadel it is the project ID or the application's client ID
	// (OIDC_AUDIENCE, required).
	OIDCAudience string
	// OIDCJWKSURL is where the issuer publishes its signing keys
	// (OIDC_JWKS_URL, default <issuer>/oauth/v2/keys, Zitadel's path).
	OIDCJWKSURL string
	// OIDCRequireMFA rejects access tokens that were not obtained with
	// multi-factor authentication (OIDC_REQUIRE_MFA, default false).
	OIDCRequireMFA bool
	// OIDCMFAClaim is the token claim that lists how the user
	// authenticated (OIDC_MFA_CLAIM, default "amr").
	OIDCMFAClaim string
	// OIDCMFAMethods are the values of that claim that count as
	// multi-factor; a token needs at least one (OIDC_MFA_METHODS,
	// comma-separated, required when OIDC_REQUIRE_MFA is true). There is
	// no default on purpose: the values a provider issues must be read
	// from one of its real tokens, not assumed.
	OIDCMFAMethods []string
	// TenantSelfServe lets any signed-in user create a tenant. When false,
	// only platform administrators may (TENANT_SELF_SERVE, default false).
	TenantSelfServe bool
	// Environment names where the API is running: local, staging or
	// production (ENVIRONMENT, default production, the strictest).
	Environment string
	// Port is the TCP port the HTTP server listens on (PORT, default 8080).
	Port int
	// LogLevel is the minimum level that is logged (LOG_LEVEL, default info).
	LogLevel slog.Level
	// ShutdownTimeout bounds how long in-flight requests may take to finish
	// after a shutdown signal (SHUTDOWN_TIMEOUT, default 15s).
	ShutdownTimeout time.Duration
}

// Values of Config.Environment.
const (
	EnvLocal      = "local"
	EnvStaging    = "staging"
	EnvProduction = "production"
)

// DocsEnabled reports whether the interactive API documentation is served.
// It never is in production.
func (c Config) DocsEnabled() bool {
	return c.Environment != EnvProduction
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
		Environment:     EnvProduction,
		OIDCMFAClaim:    auth.DefaultAuthMethodsClaim,
		Port:            8080,
		LogLevel:        slog.LevelInfo,
		ShutdownTimeout: 15 * time.Second,
	}
	var errs []error

	cfg.DatabaseURL = strings.TrimSpace(getenv("DATABASE_URL"))
	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL: is required"))
	}

	cfg.OIDCIssuer = strings.TrimSpace(getenv("OIDC_ISSUER"))
	if err := auth.CheckProviderURL(cfg.OIDCIssuer); err != nil {
		errs = append(errs, fmt.Errorf("OIDC_ISSUER: %w", err))
	}
	cfg.OIDCAudience = strings.TrimSpace(getenv("OIDC_AUDIENCE"))
	if cfg.OIDCAudience == "" {
		errs = append(errs, errors.New("OIDC_AUDIENCE: is required"))
	}
	cfg.OIDCJWKSURL = strings.TrimSpace(getenv("OIDC_JWKS_URL"))
	if cfg.OIDCJWKSURL == "" {
		cfg.OIDCJWKSURL = strings.TrimRight(cfg.OIDCIssuer, "/") + "/oauth/v2/keys"
	} else if err := auth.CheckProviderURL(cfg.OIDCJWKSURL); err != nil {
		errs = append(errs, fmt.Errorf("OIDC_JWKS_URL: %w", err))
	}

	if v := strings.TrimSpace(getenv("OIDC_REQUIRE_MFA")); v != "" {
		require, err := strconv.ParseBool(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("OIDC_REQUIRE_MFA: %q is not true or false", v))
		}
		cfg.OIDCRequireMFA = require
	}
	if v := strings.TrimSpace(getenv("OIDC_MFA_CLAIM")); v != "" {
		cfg.OIDCMFAClaim = v
	}
	for _, method := range strings.Split(getenv("OIDC_MFA_METHODS"), ",") {
		if method = strings.TrimSpace(method); method != "" {
			cfg.OIDCMFAMethods = append(cfg.OIDCMFAMethods, method)
		}
	}
	if cfg.OIDCRequireMFA && len(cfg.OIDCMFAMethods) == 0 {
		errs = append(errs, errors.New("OIDC_MFA_METHODS: is required when OIDC_REQUIRE_MFA is true"))
	}

	if v := strings.TrimSpace(getenv("TENANT_SELF_SERVE")); v != "" {
		selfServe, err := strconv.ParseBool(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("TENANT_SELF_SERVE: %q is not true or false", v))
		}
		cfg.TenantSelfServe = selfServe
	}

	if v := strings.TrimSpace(getenv("ENVIRONMENT")); v != "" {
		if !slices.Contains([]string{EnvLocal, EnvStaging, EnvProduction}, v) {
			errs = append(errs, fmt.Errorf("ENVIRONMENT: %q is not one of local, staging, production", v))
		}
		cfg.Environment = v
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
