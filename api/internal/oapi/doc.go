// Package oapi holds the server interfaces and types generated from
// openapi/openapi.yaml. Do not edit oapi.gen.go by hand: change the spec and
// run `make generate` from the repo root.
package oapi

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.8.2 -config config.yaml ../../../openapi/openapi.yaml
