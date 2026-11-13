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
  reads before it writes, so a request from an existing user writes
  nothing.
- **Profile data comes from the userinfo endpoint, not the access token.**
  Access tokens often carry no profile claims. On first sight of a user,
  and when the stored profile is older than 24 hours, the API calls the
  provider's userinfo endpoint (found through OIDC discovery) with the
  user's own token and stores name, locale and email. A response for a
  different subject is discarded.
- **A userinfo failure never fails the request.** The stored profile is
  kept and the sync is retried after a minute. Concurrent requests from
  one user share a single call.
- **Email is stored only when the provider says it is verified**
  (`email_verified`), because email will later be used to match
  invitations. An unverified address never replaces a verified one.
  `users.email` is nullable: a user may have none yet.
- **Optional MFA check.** With `OIDC_REQUIRE_MFA=true` a token is rejected
  with 401 and code `mfa_required` unless its authentication-method claim
  (`OIDC_MFA_CLAIM`, default `amr`) has one of `OIDC_MFA_METHODS`. The
  accepted values have no default and the API refuses to start without
  them: what a provider puts in that claim must be read from a real
  token. Zitadel's login policy remains the place MFA is enforced; this
  check is a second line of defence.
- **Zitadel is the system of record for sign-ins.** The API sees
  requests, not sign-ins, and does not log them as such.
- **`security_events`** is a user-scoped, append-only table (row-level
  security on `app.user_id`; SELECT and INSERT only; triggers reject
  changes from every role). It records `user.provisioned` (written inside
  `provision_user`, in the same transaction as the insert),
  `profile.email_changed` and `auth.mfa_required` (at most once per user
  per ten minutes per API instance). Its metadata holds no personal data:
  an email change is recorded without either address. `audit_log` stays
  the per-tenant record; these events happen before a tenant is chosen.
- **Interactive API docs at `/docs`, outside production only.**
  `ENVIRONMENT` is `local`, `staging` or `production` and defaults to
  `production`. The three docs routes are exempt from authentication
  because they serve only the contract. The viewer is loaded from a CDN
  at a pinned version with integrity hashes, under a strict content
  security policy.
- **`cmd/devtoken`** gets a developer an access token through the device
  authorization flow, so no password or client secret is involved. It is
  not in the API image.
- **Signing keys must be fetched over HTTPS.** Plain HTTP is accepted only
  for a loopback address, for local development and tests.
- **`go-jose` rather than a higher-level OIDC library**, so that the key
  cache and the distinction between "invalid" and "cannot tell" are ours
  and tested.

## Not verified yet

Nothing here has run against a real Zitadel. Work through
`docs/runbooks/zitadel-smoke-test.md` and record the result below. In
particular, to be confirmed from a real token: the audience to use for
`OIDC_AUDIENCE`, and the claim and values for the MFA check.

## Follow-ups

- **Turn the MFA check on** in staging once its values are confirmed.
- **Show security events to the user** (an endpoint and a page), and
  notify them of an email change.
- **Revocation.** A token stays valid until it expires even if the user is
  disabled in Zitadel. Keep access tokens short-lived; add introspection
  only if that is not enough.
- **A local Zitadel** in docker-compose, so the whole flow can be run
  without a hosted instance.
- **Retention** of `security_events`, with the privacy purge path in 0002.
- **Rate limiting** of unauthenticated requests (Redis), before the pilot.
