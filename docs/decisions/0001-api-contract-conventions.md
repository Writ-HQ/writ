# 0001 — API contract conventions

Date: 2026-11-12

## Decisions

- **Paths carry the version.** Every path in `openapi/openapi.yaml` is
  written in full (`/v1/...`) rather than using a `/v1` server URL, so one
  spec can also describe the unversioned probes.
- **Probes are unversioned.** `/healthz` and `/readyz` stay at the root.
  Load balancers and ECS call them, and they must not move when the API
  version changes.
- **One error schema.** Every error body is `Error`: `code`, `message`,
  `request_id`, optional `details`. The web app translates by `code`
  (English and French); `message` is English, for developers only. We chose
  this over RFC 9457 problem details because a stable code per error is what
  the bilingual UI needs, and the shape is simpler to type.
- **Error codes are a closed list.** `ErrorCode` and `ErrorDetailCode` are
  enums in the spec, so the web client gets them as union types. The Go
  constants live in one file, `api/internal/apierror/codes.go`; a test fails
  if that file and the spec disagree. Clients must still tolerate unknown
  codes, because new ones can be added.
- **Cursor pagination only.** List endpoints take `cursor` and `limit` and
  return `{ data, page: { next_cursor } }`. Cursors are opaque. No offsets
  and no total counts, which are slow under row-level security and leak
  list sizes.
- **Generated code is committed.** `make generate` writes
  `api/internal/oapi/oapi.gen.go` (oapi-codegen, chi strict server) and
  `web/src/lib/api/schema.gen.ts` (openapi-typescript). CI runs
  `make generate-check` and fails when they differ from the spec.
- **Generators are pinned by version** in `api/internal/oapi/doc.go` and
  `web/package.json`, and run with `go run pkg@version` so the tool's
  dependencies stay out of the service's `go.mod`.
