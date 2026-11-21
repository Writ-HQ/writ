# Before launch

Things that are deliberately not done yet and must be before real
campaign data is in the system. Each item names where the decision was
made. Add to this list whenever something is deferred with the words
"before the pilot" or "before launch"; tick an item only when it is done
and verified, with the date.

## Before the penetration test (week 15)

- [ ] **MFA is verified by the API, not only by Zitadel.** Today Zitadel's
      Force MFA policy is the only enforcement, because access tokens
      carry no claim saying how the user signed in. Add that claim with a
      Zitadel action, read its real values from a token (never from
      documentation), then set `OIDC_REQUIRE_MFA`, `OIDC_MFA_CLAIM` and
      `OIDC_MFA_METHODS`. The check is already built and tested.
      See decisions/0004 and runbooks/zitadel-smoke-test.md, step 5.

## Before launch

- [ ] **Zitadel is self-hosted in AWS ca-central-1.** Development uses
      Zitadel Cloud in a US region. Names, email addresses and sign-in
      history of campaign staff are personal data, and the project's rule
      is that all data stays in ca-central-1. Moving changes the issuer
      URL, so every token and the `OIDC_ISSUER` setting change with it;
      users are matched by subject identifier, so plan how existing
      accounts carry over. See decisions/0004.
- [ ] **Platform admins must hand over ownership and remove their own
      membership after onboarding a campaign.** Creating a tenant makes
      the creator its owner, so whoever onboards a campaign can read
      everything in it until they leave. There is no way to do the
      hand-over through the API yet; it comes with member management.
      Until then, keep a list of tenants a platform admin still owns and
      clear it before any real campaign data goes in.
      See decisions/0005.
- [ ] **Access token lifetime is an hour or less** in the production
      Zitadel, and the kill switch (`users.disabled_at`) has admin
      tooling, so that shutting an account out does not need database
      access. See decisions/0004.
- [ ] **The staging infrastructure has been applied and a deploy has run
      end to end.** It is validated and plan-tested only.
      See decisions/0003.
- [ ] **Load balancer access logs, a web application firewall and
      alarms** (5xx rate, unhealthy targets, database CPU and storage).
      See decisions/0003.
- [ ] **Rate limiting** of unauthenticated requests.
      See decisions/0004.
- [ ] **A privileged, audited purge path** for privacy deletion requests
      and retention limits, covering `audit_log` and `security_events`.
      See decisions/0002.
- [ ] **Production uses one NAT gateway per zone and a multi-AZ
      database.** See decisions/0003.
