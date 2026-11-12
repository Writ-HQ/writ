# Tools are pinned here and run with `go run`, so they stay out of go.mod.
# Dependabot does not see these versions; bump them by hand.
GOLANGCI_LINT_VERSION := v2.15.0
GOVULNCHECK_VERSION := v1.9.0
GOLANGCI_LINT := go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@$(GOLANGCI_LINT_VERSION)
GOVULNCHECK := go run golang.org/x/vuln/cmd/govulncheck@$(GOVULNCHECK_VERSION)

.PHONY: run test lint vuln generate

run:
	go run ./cmd/server

test:
	go test -race ./...

lint:
	$(GOLANGCI_LINT) run ./...

vuln:
	$(GOVULNCHECK) ./...

# Regenerate Go code from ../openapi/openapi.yaml. Use `make generate` at the
# repo root to regenerate the web client as well.
generate:
	go generate ./...
