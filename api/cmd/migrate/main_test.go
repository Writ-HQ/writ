package main

import (
	"bytes"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/Writ-HQ/writ/api/internal/database/dbtest"
)

var db *dbtest.DB

func TestMain(m *testing.M) { os.Exit(dbtest.Run(m, &db)) }

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestRunRejectsBadArguments(t *testing.T) {
	for _, args := range [][]string{nil, {"down"}, {"up", "extra"}} {
		if err := run(t.Context(), args, env(nil), &bytes.Buffer{}); !errors.Is(err, errUsage) {
			t.Errorf("run(%v) error = %v, want usage", args, err)
		}
	}
}

func TestRunRequiresDatabaseURL(t *testing.T) {
	err := run(t.Context(), []string{"up"}, env(nil), &bytes.Buffer{})
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL") {
		t.Errorf("error = %v, want one naming DATABASE_URL", err)
	}
}

// dbtest has already applied every migration, so this proves the command
// connects as the owner, finds the embedded migrations and agrees that
// nothing is pending.
func TestUpAndStatusAgainstAMigratedDatabase(t *testing.T) {
	getenv := env(map[string]string{"DATABASE_URL": db.Owner.Config().ConnString()})

	var out bytes.Buffer
	if err := run(t.Context(), []string{"up"}, getenv, &out); err != nil {
		t.Fatalf("up: %v", err)
	}
	if got := out.String(); !strings.Contains(got, "no migrations to apply") {
		t.Errorf("up printed %q, want it to report nothing pending", got)
	}

	out.Reset()
	if err := run(t.Context(), []string{"status"}, getenv, &out); err != nil {
		t.Fatalf("status: %v", err)
	}
	got := out.String()
	if !strings.Contains(got, "00001_setup.sql") || strings.Contains(got, "pending") {
		t.Errorf("status printed:\n%s\nwant every migration listed as applied", got)
	}
}

// The application role cannot run migrations: it has no DDL rights.
func TestUpAsTheApplicationRoleFails(t *testing.T) {
	getenv := env(map[string]string{"DATABASE_URL": db.App.Config().ConnString()})
	err := run(t.Context(), []string{"up"}, getenv, &bytes.Buffer{})
	if err == nil {
		t.Fatal("up as writ_app succeeded, want an error")
	}
	if strings.Contains(err.Error(), db.App.Config().ConnConfig.Password) {
		t.Error("the error leaks the password")
	}
}
