# Run from the repo root.
GENERATED := api/internal/oapi web/src/lib/api \
	api/internal/tenants/tenantsdb api/internal/auth/authdb api/internal/audit/auditdb

.PHONY: run test lint vuln migrate migrate-status db-up db-down \
	generate generate-api generate-web generate-check

run test lint vuln migrate migrate-status:
	$(MAKE) -C api $@

# Start the local PostgreSQL and wait until it accepts connections.
db-up:
	docker compose up -d --wait postgres

# Stop it. The data volume is kept; `docker compose down -v` removes it.
db-down:
	docker compose down

# Regenerate all code derived from openapi/openapi.yaml and the SQL queries.
generate: generate-api generate-web

generate-api:
	$(MAKE) -C api generate

generate-web: web/node_modules/.package-lock.json
	npm --prefix web run generate:api

web/node_modules/.package-lock.json: web/package-lock.json
	npm --prefix web ci

# Fail if the committed generated code differs from what the spec and the
# SQL queries produce.
generate-check: generate
	@if [ -n "$$(git status --porcelain -- $(GENERATED))" ]; then \
		echo "Generated code is out of date. Run 'make generate' and commit the result:"; \
		git status --short -- $(GENERATED); \
		git --no-pager diff -- $(GENERATED); \
		exit 1; \
	fi
	@echo "Generated code is up to date."
