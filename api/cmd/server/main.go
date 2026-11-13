// Command server runs the campaign CRM HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/Writ-HQ/writ/api/internal/auth"
	"github.com/Writ-HQ/writ/api/internal/config"
	"github.com/Writ-HQ/writ/api/internal/database"
	"github.com/Writ-HQ/writ/api/internal/health"
	"github.com/Writ-HQ/writ/api/internal/httpserver"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	err := run(ctx, os.Getenv, os.Stdout)
	stop()
	if err != nil {
		slog.New(slog.NewJSONHandler(os.Stdout, nil)).Error("server exited", "error", err)
		os.Exit(1)
	}
}

// run starts the server and blocks until ctx is cancelled and in-flight
// requests have drained, or the server fails.
func run(ctx context.Context, getenv func(string) string, logOut io.Writer) error {
	cfg, err := config.Load(getenv)
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(logOut, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(logger)

	pool, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	hh := health.New(logger, health.Check{Name: "database", Fn: pool.Ping})
	authenticator := auth.NewService(auth.NewVerifier(auth.VerifierConfig{
		Issuer:           cfg.OIDCIssuer,
		Audience:         cfg.OIDCAudience,
		JWKSURL:          cfg.OIDCJWKSURL,
		AuthMethodsClaim: cfg.OIDCMFAClaim,
	}), pool, auth.Options{
		Profiles:   auth.NewUserinfoClient(cfg.OIDCIssuer, nil, nil),
		RequireMFA: cfg.OIDCRequireMFA,
		MFAMethods: cfg.OIDCMFAMethods,
		Logger:     logger,
	})
	router := httpserver.NewRouter(logger, authenticator, httpserver.Handlers{
		Health:  hh,
		Account: auth.NewHandler(),
	}, httpserver.Options{Docs: cfg.DocsEnabled()})
	srv := httpserver.New(cfg.Addr(), router, logger)

	var lc net.ListenConfig
	ln, err := lc.Listen(ctx, "tcp", srv.Addr)
	if err != nil {
		return fmt.Errorf("listening on %s: %w", srv.Addr, err)
	}

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()
	logger.Info("server started", "addr", ln.Addr().String(),
		"environment", cfg.Environment, "mfa_required", cfg.OIDCRequireMFA, "docs", cfg.DocsEnabled())

	select {
	case err := <-serveErr:
		return fmt.Errorf("serving: %w", err)
	case <-ctx.Done():
	}

	logger.Info("shutdown started", "timeout", cfg.ShutdownTimeout.String())
	hh.SetShuttingDown()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		_ = srv.Close()
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	if err := <-serveErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("serving: %w", err)
	}
	logger.Info("shutdown complete")
	return nil
}
