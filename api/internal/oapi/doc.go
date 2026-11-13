// Package oapi holds the server interfaces and types generated from
// openapi/openapi.yaml. Do not edit oapi.gen.go by hand: change the spec and
// run `make generate` from the repo root.
package oapi

import _ "embed"

//go:generate go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.8.2 -config config.yaml ../../../openapi/openapi.yaml

// The spec lives outside this module's directory, where go:embed cannot
// reach, so `make generate` keeps a copy here. `make generate-check` fails
// if the copy is stale.
//go:generate cp ../../../openapi/openapi.yaml openapi.gen.yaml

// Spec is openapi/openapi.yaml as it was when the code was generated.
//
//go:embed openapi.gen.yaml
var Spec []byte
