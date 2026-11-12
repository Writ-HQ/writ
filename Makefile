# Run from the repo root.
GENERATED := api/internal/oapi web/src/lib/api

.PHONY: run test lint vuln generate generate-api generate-web generate-check

run test lint vuln:
	$(MAKE) -C api $@

# Regenerate all code derived from openapi/openapi.yaml.
generate: generate-api generate-web

generate-api:
	$(MAKE) -C api generate

generate-web: web/node_modules/.package-lock.json
	npm --prefix web run generate:api

web/node_modules/.package-lock.json: web/package-lock.json
	npm --prefix web ci

# Fail if the committed generated code differs from what the spec produces.
generate-check: generate
	@if [ -n "$$(git status --porcelain -- $(GENERATED))" ]; then \
		echo "Generated code is out of date. Run 'make generate' and commit the result:"; \
		git status --short -- $(GENERATED); \
		git --no-pager diff -- $(GENERATED); \
		exit 1; \
	fi
	@echo "Generated code is up to date."
