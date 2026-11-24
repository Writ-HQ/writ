# 0007: Constituency offices are the first customer

Date: 2026-11-24

## Decision

Writ's first customers are constituency offices: the offices of elected
members, federal or provincial, that answer constituents and handle
their cases. Election campaigns and advocacy groups follow. This answers
CLAUDE.md's open question about the first customer type and the first
of the decisions needed in docs/product-plan.md.

## Why

- Offices need their tools all year, not only during an election.
- Federal and provincial parties run their own voter databases for
  their candidates, so campaigns are a harder first sale. Municipal
  races (without parties in Ontario) and independent candidates come
  later.
- Their work is casework, messages and newsletters: the core Writ is
  building now.

## What follows

- **Office and campaign data never mix.** A constituency office is its
  own kind of tenant, and nothing moves from an office tenant to a
  campaign tenant (docs/product-plan.md, Guardrails, 1). This needs a
  tenant kind in the tenants module and a rule that blocks exports,
  syncs and copies between kinds. Not built yet.
- **Cases become central to the pilot.** The 15-week roadmap in
  CLAUDE.md has no casework module yet. A proposal to add it, and to
  decide what moves to make room, comes next; the roadmap is unchanged
  until that is approved.
- **The schema stays jurisdiction-neutral:** offices exist at every
  level of government, and nothing assumes one.
- **The landing page names constituency offices** in Built for, the
  Solutions menu and the FAQ.

## Still open

The rest of the decisions in docs/product-plan.md: the pilot's scope,
providers for texts and calls, and pricing. Pilot pricing needs an
election lawyer's view (Guardrails, 6).
