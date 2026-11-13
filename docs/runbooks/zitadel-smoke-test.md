# Smoke test against a real Zitadel

Everything in authentication has so far been tested against a fake
identity provider. This checklist is for the first run against a real
Zitadel instance, and for any later change of instance. Work through it
in order; each step says what to expect.

Items marked **confirm** are things the code deliberately does not assume.
Read the value from your own instance and write it down here once known.

Use a non-production instance and a test user. A token is a credential:
do not paste one into a ticket, chat or commit.

## 1. Zitadel settings

- [ ] **A project** for Writ. Note its project (resource) ID.
- [ ] **An application for the API's callers** (the web app, later). In its
      token settings, set the access token type to **JWT**. With the
      default opaque tokens every request gets 401, because an opaque
      token cannot be verified against the published keys.
- [ ] **An application for `devtoken`**: a native application with the
      **device code** grant enabled, and its access token type also set to
      **JWT**. Note its client ID. It needs no secret.
- [ ] **MFA policy.** In the login policy, require a second factor
      ("force MFA"), and make sure it applies to every way users can sign
      in, including external identity providers if any are configured.
      Zitadel is where MFA is enforced; the API's check (step 5) is a
      second line of defence.
- [ ] **Short-lived access tokens.** A token stays valid until it expires
      even if the user is disabled. Keep the access token lifetime short
      (an hour or less).
- [ ] **A test user** with a verified email address and a second factor
      set up.

## 2. Get a token

```sh
cd api
export OIDC_ISSUER=https://<your-instance>          # no trailing slash
export OIDC_DEVTOKEN_CLIENT_ID=<devtoken client id>
TOKEN=$(go run ./cmd/devtoken)
```

Follow the URL it prints, sign in as the test user with the second
factor, and the command finishes.

- [ ] It printed a sign-in URL and a code, and completed after sign-in.

If it says the provider does not advertise the device authorization flow,
the grant is not enabled on the application.

## 3. Read the token: issuer, audience, MFA claim

```sh
echo "$TOKEN" | jq -R 'split(".")[1] | @base64d | fromjson'
```

If that prints an error, the token is opaque, not a JWT: fix the token
type in step 1.

- [ ] `iss` is exactly the value of `OIDC_ISSUER`. The API compares them
      character for character, so a trailing slash on one side only is a
      mismatch.
- [ ] `exp` is present and less than about an hour away.
- [ ] **`OIDC_AUDIENCE` is the project ID.** Look at `aud`. On the
      development instance (Zitadel Cloud, checked 2026-11-13) a token
      requested with `openid profile email offline_access` carries two
      audiences: the client ID of the application that requested it, and
      the ID of the project that application belongs to. No extra scope
      was needed. Set `OIDC_AUDIENCE` to the **project ID**: it identifies
      this API and is in the token whichever application of the project
      requested it, so adding the web app, then a mobile app, changes
      nothing here. A client ID would accept tokens from that one
      application only.

      Confirm that the project ID is in `aud`. If only the client ID is
      there, stop and find out why before using the client ID instead.

- [ ] **The MFA claim: absent, so the API's MFA check stays off.** On the
      same instance the access token has no `amr` claim and no other claim
      describing how the user signed in. Its claims were `iss`, `sub`,
      `aud`, `exp`, `iat`, `nbf`, `client_id` and `jti`, after a sign-in
      with a second factor. `OIDC_REQUIRE_MFA=true` would therefore reject
      every request.

      Check whether that is still so. If a claim listing the
      authentication methods has appeared, sign in once with the second
      factor and once, with a user allowed to, without, and note:

      - claim name (for `OIDC_MFA_CLAIM`): `__________`
      - values present only when a second factor was used (for
        `OIDC_MFA_METHODS`, comma-separated): `__________`

      Do not take these from documentation. If the two tokens carry the
      same values the claim cannot tell them apart and the check must stay
      off.

- [ ] **Token lifetime.** `exp` minus `iat` on that token was 12 hours.
      Shorten the access token lifetime in the instance's settings (see
      step 1) and confirm the difference here is an hour or less.

## 4. Call the API

Start the API against the instance:

```sh
make db-up && make migrate
OIDC_ISSUER=$OIDC_ISSUER OIDC_AUDIENCE=<project id> make run
```

With the values in `.env` (copy `.env.example`), plain `make run` and
`TOKEN=$(make -s devtoken)` do the same.

In another terminal:

```sh
# 1. The probes need no token.
curl -i http://localhost:8080/healthz

# 2. No token: 401, code "unauthenticated".
curl -i http://localhost:8080/v1/me

# 3. The real token: 200 with the test user's id, email, name and locale.
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/v1/me

# 4. A damaged token: 401. This cuts the last character off the signature.
curl -i -H "Authorization: Bearer ${TOKEN%?}" http://localhost:8080/v1/me

# 5. The wrong audience: restart the API with OIDC_AUDIENCE=wrong and
#    repeat call 3. Expect 401.
```

- [ ] Call 1 returns 200.
- [ ] Call 2 returns 401 with `"code":"unauthenticated"`.
- [ ] Call 3 returns 200, and `email`, `display_name` and `locale` match
      the test user. They come from Zitadel's userinfo endpoint. If
      `email` is `null`, either the address is not verified in Zitadel or
      the token was requested without the `email` scope; if
      `display_name` is empty, without the `profile` scope.
- [ ] Call 4 returns 401.
- [ ] Call 5 returns 401.
- [ ] The API's log shows `token rejected` with a reason for calls 4 and
      5, and contains neither a token nor an email address.

The same calls can be made from the interactive documentation at
<http://localhost:8080/docs> (served outside production only): choose
**Authorize** and paste the token.

## 5. The MFA check

Skip this section while the access token has no authentication-method
claim (step 3). Until then MFA is enforced by Zitadel's login policy
alone. Only once step 3 has given you a real claim and real values:

```sh
OIDC_ISSUER=$OIDC_ISSUER OIDC_AUDIENCE=<chosen audience> \
OIDC_REQUIRE_MFA=true OIDC_MFA_METHODS=<values from step 3> \
OIDC_MFA_CLAIM=<claim from step 3, if not amr> make run
```

- [ ] A token from a sign-in with the second factor returns 200.
- [ ] A token from a sign-in without it returns 401 with
      `"code":"mfa_required"`.
- [ ] If both return 401, the values are wrong: nobody can sign in. Fix
      them before enabling this anywhere shared.

## 6. Record the outcome

- [ ] Write the confirmed audience, MFA claim and MFA values into the
      staging variables (`oidc_issuer`, `oidc_audience`) and, once the
      MFA check is to be enabled there, the API's environment.
- [ ] Note the Zitadel version tested, and the date, in
      `docs/decisions/0004-authentication.md` under "Not verified yet".
