# Tools are pinned here and run with `go run`, so they stay out of go.mod.
# Dependabot does not see these versions; bump them by hand.
GOLANGCI_LINT_VERSION := v2.15.0
GOVULNCHECK_VERSION := v1.9.0
SQLC_VERSION := v1.31.1
# Keep in step with github.com/pressly/goose/v3 in go.mod.
GOOSE_VERSION := v3.30.0
GOLANGCI_LINT := go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION)
GOVULNCHECK := go run golang.org/x/vuln/cmd/govulncheck@$(GOVULNCHECK_VERSION)
SQLC := go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION)
GOOSE := go run github.com/pressly/goose/v3/cmd/goose@$(GOOSE_VERSION)

# Defaults for the local database started by `make db-up` (see
# ../docker-compose.yml). The API connects as writ_app; migrations run as
# writ_owner. The host port is 54320, not 5432, so it does not collide with
# a PostgreSQL already installed on the machine.
POSTGRES_PORT ?= 54320
DATABASE_URL ?= postgres://writ_app:writ_app_dev@localhost:$(POSTGRES_PORT)/writ?sslmode=disable
MIGRATE_DATABASE_URL ?= postgres://writ_owner:writ_owner_dev@localhost:$(POSTGRES_PORT)/writ?sslmode=disable

# The identity provider. These defaults only let the API start locally:
# until they point at a real Zitadel instance, the probes work and every
# other endpoint answers 503. The audience is the Zitadel project ID or
# the application's client ID.
OIDC_ISSUER ?= http://localhost:8082
OIDC_AUDIENCE ?= writ-local

.PHONY: run test lint vuln generate migrate migrate-status

run:
	DATABASE_URL="$(DATABASE_URL)" OIDC_ISSUER="$(OIDC_ISSUER)" OIDC_AUDIENCE="$(OIDC_AUDIENCE)" go run ./cmd/server

# The database tests start PostgreSQL in Docker. `go test -short ./...`
# skips them.
test:
	go test -race ./...

lint:
	$(GOLANGCI_LINT) run ./...

vuln:
	$(GOVULNCHECK) ./...

# Regenerate Go code from ../openapi/openapi.yaml and from the SQL queries.
# Use `make generate` at the repo root to regenerate the web client as well.
generate:
	go generate ./...
	$(SQLC) generate

# Apply migrations to the local database. Never point this at production.
migrate:
	GOOSE_DRIVER=postgres GOOSE_DBSTRING="$(MIGRATE_DATABASE_URL)" GOOSE_MIGRATION_DIR=db/migrations $(GOOSE) up

migrate-status:
	GOOSE_DRIVER=postgres GOOSE_DBSTRING="$(MIGRATE_DATABASE_URL)" GOOSE_MIGRATION_DIR=db/migrations $(GOOSE) status
