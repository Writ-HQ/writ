# 0004 — Authentication

Date: 2026-11-13

## Decisions

- **The API accepts JWT access tokens from one OpenID Connect issuer**
  (Zitadel), sent as `Authorization: Bearer`. It never sees passwords and
  holds no sessions. Zitadel must be set to issue JWT access tokens for
  the application; its default, opaque tokens, cannot be verified this way
  and are rejected.
- **Every request is authenticated unless its endpoint is public.** The
  check runs before routing, so without a token a caller gets 401 for
  every path, existing or not. The public list is in
  `httpserver/authenticate.go` and a test fails if it differs from the
  operations marked `security: []` in the spec.
- **What is verified:** the signature, against the issuer's published keys;
  an asymmetric algorithm (never `none` or HMAC); the exact issuer; our
  audience among the token's audiences; expiry, which must be present;
  not-before; and a non-empty subject. Clocks may differ by 30 seconds.
- **Keys are cached** for an hour and fetched again when a token names an
  unknown key ID, at most once a minute. That limit stops made-up key IDs
  from turning the API into a way to flood the identity provider; its cost
  is that a newly rotated key can take up to a minute to be accepted. If
  a fetch fails, keys already cached keep working.
- **An unreachable identity provider is 503, not 401.** When the keys
  cannot be fetched the token is neither valid nor invalid. Clients should
  retry, not sign the user out. This added the `service_unavailable` error
  code.
- **Every rejection looks the same to the client:** 401, code
  `unauthenticated`, one fixed message. The reason is logged with the
  request ID. Neither the token nor its claims are ever logged.
- **The user row is found or created on each request** through
  `provision_user` (see 0002), keyed on the token's subject. That function
  now reads before it writes, so a request from an existing user writes
  nothing.
- **Email may be unknown.** Access tokens often carry no email claim, and
  an address is stored only when the token says the provider verified it
  (`email_verified`), because email will later be used to match
  invitations. `users.email` is therefore nullable.
- **Signing keys must be fetched over HTTPS.** Plain HTTP is accepted only
  for a loopback address, for local development and tests.
- **`go-jose` rather than a higher-level OIDC library**, so that the key
  cache and the distinction between "invalid" and "cannot tell" are ours
  and tested.

## Follow-ups

- **Profile sync.** An existing user's email, name and locale are not
  updated from later tokens. Fetch them from the provider's userinfo
  endpoint at sign-in, or sync with a Zitadel action.
- **MFA is required by the project but not yet checked by the API.**
  Enforce it in Zitadel's login policy, and decide whether the API should
  also require the `amr` claim.
- **Revocation.** A token stays valid until it expires even if the user is
  disabled in Zitadel. Keep access tokens short-lived; add introspection
  only if that is not enough.
- **Audit of sign-ins.** `audit_log` is per tenant and a request is not a
  sign-in. Decide where sign-in events are recorded: Zitadel's own log, or
  a global table.
- **A local Zitadel** in docker-compose, so the whole flow can be run by
  hand.
- **Rate limiting** of unauthenticated requests (Redis), before the pilot.
