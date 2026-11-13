package config

import (
	"log/slog"
	"strings"
	"testing"
	"time"
)

const testDatabaseURL = "postgres://writ_app@localhost:5432/writ"

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

// required returns the variables that have no default, plus overrides.
func required(overrides map[string]string) func(string) string {
	m := map[string]string{
		"DATABASE_URL":  testDatabaseURL,
		"OIDC_ISSUER":   "https://auth.example.ca",
		"OIDC_AUDIENCE": "writ-api",
	}
	for k, v := range overrides {
		m[k] = v
	}
	return env(m)
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(required(nil))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.DatabaseURL != testDatabaseURL || cfg.Port != 8080 || cfg.LogLevel != slog.LevelInfo || cfg.ShutdownTimeout != 15*time.Second {
		t.Errorf("unexpected defaults: %+v", cfg)
	}
	if cfg.OIDCIssuer != "https://auth.example.ca" || cfg.OIDCAudience != "writ-api" ||
		cfg.OIDCJWKSURL != "https://auth.example.ca/oauth/v2/keys" {
		t.Errorf("unexpected identity provider settings: %+v", cfg)
	}
	if got := cfg.Addr(); got != ":8080" {
		t.Errorf("Addr() = %q, want %q", got, ":8080")
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(required(map[string]string{
		"PORT":             "9090",
		"LOG_LEVEL":        "debug",
		"SHUTDOWN_TIMEOUT": "30s",
	}))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != 9090 || cfg.LogLevel != slog.LevelDebug || cfg.ShutdownTimeout != 30*time.Second {
		t.Errorf("unexpected config: %+v", cfg)
	}
}

func TestLoadReportsAllInvalidValues(t *testing.T) {
	_, err := Load(env(map[string]string{
		"PORT":             "70000",
		"LOG_LEVEL":        "loud",
		"SHUTDOWN_TIMEOUT": "-1s",
	}))
	if err == nil {
		t.Fatal("Load() error = nil, want error")
	}
	for _, name := range []string{"DATABASE_URL", "OIDC_ISSUER", "OIDC_AUDIENCE", "PORT", "LOG_LEVEL", "SHUTDOWN_TIMEOUT"} {
		if !strings.Contains(err.Error(), name) {
			t.Errorf("error %q does not mention %s", err, name)
		}
	}
}

func TestLoadIdentityProviderURLs(t *testing.T) {
	tests := []struct {
		name, issuer, jwksURL string
		wantErr               string
		wantJWKSURL           string
	}{
		{name: "https", issuer: "https://auth.example.ca", wantJWKSURL: "https://auth.example.ca/oauth/v2/keys"},
		{name: "explicit key URL", issuer: "https://auth.example.ca", jwksURL: "https://keys.example.ca/jwks.json", wantJWKSURL: "https://keys.example.ca/jwks.json"},
		{name: "http on loopback for development", issuer: "http://localhost:8082", wantJWKSURL: "http://localhost:8082/oauth/v2/keys"},
		{name: "http on a loopback address", issuer: "http://127.0.0.1:8082", wantJWKSURL: "http://127.0.0.1:8082/oauth/v2/keys"},
		{name: "http elsewhere", issuer: "http://auth.example.ca", wantErr: "OIDC_ISSUER"},
		{name: "http host that only starts with localhost", issuer: "http://localhost.example.ca", wantErr: "OIDC_ISSUER"},
		{name: "not a URL", issuer: "auth.example.ca", wantErr: "OIDC_ISSUER"},
		{name: "credentials in the URL", issuer: "https://someone@auth.example.ca", wantErr: "OIDC_ISSUER"},
		{name: "http key URL", issuer: "https://auth.example.ca", jwksURL: "http://keys.example.ca/jwks.json", wantErr: "OIDC_JWKS_URL"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := Load(required(map[string]string{"OIDC_ISSUER": tt.issuer, "OIDC_JWKS_URL": tt.jwksURL}))
			if tt.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("Load() error = %v, want one naming %s", err, tt.wantErr)
				}
				if strings.Contains(err.Error(), "someone") {
					t.Errorf("the error echoes the URL: %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("Load() error = %v", err)
			}
			if cfg.OIDCJWKSURL != tt.wantJWKSURL {
				t.Errorf("OIDCJWKSURL = %q, want %q", cfg.OIDCJWKSURL, tt.wantJWKSURL)
			}
		})
	}
}
