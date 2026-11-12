// Package dbtest starts a real PostgreSQL in Docker for tests, with the
// same roles as every other environment and all migrations applied.
//
// Use it from TestMain:
//
//	var db *dbtest.DB
//
//	func TestMain(m *testing.M) { os.Exit(dbtest.Run(m, &db)) }
package dbtest

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/Writ-HQ/writ/api/db/migrations"
)

// Image is the PostgreSQL image tests run against. Keep it in step with
// docker-compose.yml.
const Image = "postgres:18-alpine"

// DB gives tests one pool per database role.
type DB struct {
	// App connects as writ_app, the role the API uses. Tests of
	// application behaviour use this pool.
	App *pgxpool.Pool
	// Owner connects as writ_owner, the role that runs migrations.
	Owner *pgxpool.Pool
	// Superuser bypasses row-level security. Use it only to prove that a
	// protection holds even then, or to inspect state.
	Superuser *pgxpool.Pool
}

// Run starts the database, stores it in *db, runs the tests and returns the
// exit code. With -short the tests are skipped, because they need Docker.
func Run(m *testing.M, db **DB) int {
	flag.Parse()
	if testing.Short() {
		fmt.Println("skipping database tests in -short mode")
		return 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	started, stop, err := start(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "dbtest: %v\n", err)
		return 1
	}
	defer stop()

	*db = started
	return m.Run()
}

func start(ctx context.Context) (*DB, func(), error) {
	ownerPassword, appPassword, superPassword := randomPassword(), randomPassword(), randomPassword()

	container, err := postgres.Run(ctx, Image,
		postgres.WithDatabase("writ"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword(superPassword),
		postgres.WithInitScripts(filepath.Join(apiRoot(), "db", "initdb", "01-roles.sh")),
		testcontainers.WithEnv(map[string]string{
			"WRIT_OWNER_PASSWORD": ownerPassword,
			"WRIT_APP_PASSWORD":   appPassword,
		}),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("starting postgres (is Docker running?): %w", err)
	}
	stop := func() { _ = testcontainers.TerminateContainer(container) }

	superURL, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		stop()
		return nil, nil, fmt.Errorf("reading the connection string: %w", err)
	}

	db := &DB{}
	for _, role := range []struct {
		pool           **pgxpool.Pool
		user, password string
	}{
		{&db.Superuser, "postgres", superPassword},
		{&db.Owner, "writ_owner", ownerPassword},
		{&db.App, "writ_app", appPassword},
	} {
		u, err := url.Parse(superURL)
		if err != nil {
			stop()
			return nil, nil, fmt.Errorf("parsing the connection string: %w", err)
		}
		u.User = url.UserPassword(role.user, role.password)
		pool, err := pgxpool.New(ctx, u.String())
		if err != nil {
			stop()
			return nil, nil, fmt.Errorf("connecting as %s: %w", role.user, err)
		}
		*role.pool = pool
	}
	stopAll := func() {
		db.App.Close()
		db.Owner.Close()
		db.Superuser.Close()
		stop()
	}

	// Migrations run as the owner role, exactly as they do when deployed.
	sqlDB := stdlib.OpenDBFromPool(db.Owner)
	defer func() { _ = sqlDB.Close() }()
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.FS)
	if err != nil {
		stopAll()
		return nil, nil, fmt.Errorf("loading migrations: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		stopAll()
		return nil, nil, fmt.Errorf("applying migrations: %w", err)
	}

	return db, stopAll, nil
}

// apiRoot returns the /api directory, found from this file's location.
func apiRoot() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "..")
}

func randomPassword() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
