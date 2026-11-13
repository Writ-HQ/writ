// Command migrate applies the database migrations embedded in the binary.
// It ships in the API image, so a deploy migrates with exactly the
// migrations that the new API version was built with.
//
//	migrate up      apply every pending migration
//	migrate status  list migrations and whether each is applied
//
// It connects with DATABASE_URL, which must be the migration owner
// (writ_owner), not the application role. There is deliberately no "down":
// a bad migration in a deployed environment is fixed with a new one.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/Writ-HQ/writ/api/db/migrations"
	"github.com/Writ-HQ/writ/api/internal/database"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	err := run(ctx, os.Args[1:], os.Getenv, os.Stdout)
	stop()
	if err != nil {
		fmt.Fprintln(os.Stderr, "migrate:", err)
		os.Exit(1)
	}
}

var errUsage = errors.New("usage: migrate up|status")

func run(ctx context.Context, args []string, getenv func(string) string, out io.Writer) error {
	if len(args) != 1 || (args[0] != "up" && args[0] != "status") {
		return errUsage
	}
	url := getenv("DATABASE_URL")
	if url == "" {
		return errors.New("DATABASE_URL is required")
	}

	// database.Open never puts the URL, which holds the password, in an
	// error.
	pool, err := database.Open(ctx, url)
	if err != nil {
		return err
	}
	defer pool.Close()
	db := stdlib.OpenDBFromPool(pool)
	defer func() { _ = db.Close() }()

	provider, err := goose.NewProvider(goose.DialectPostgres, db, migrations.FS)
	if err != nil {
		return fmt.Errorf("loading migrations: %w", err)
	}

	if args[0] == "status" {
		statuses, err := provider.Status(ctx)
		if err != nil {
			return fmt.Errorf("reading migration status: %w", err)
		}
		for _, s := range statuses {
			_, _ = fmt.Fprintf(out, "%-8s %s\n", s.State, s.Source.Path)
		}
		return nil
	}

	results, err := provider.Up(ctx)
	// Report what was applied even when a later migration failed.
	for _, r := range results {
		if r.Error == nil {
			_, _ = fmt.Fprintf(out, "applied %s in %s\n", r.Source.Path, r.Duration)
		}
	}
	if err != nil {
		return fmt.Errorf("applying migrations: %w", err)
	}
	if len(results) == 0 {
		_, _ = fmt.Fprintln(out, "no migrations to apply")
	}
	return nil
}
