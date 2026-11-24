# 0006: The waitlist is saved by the web app

Date: 2026-11-24

## Decision

The public site collects waitlist signups through a Next.js server
action (web/src/app/[locale]/waitlist/actions.ts) that writes straight
to a PostgreSQL database named by WAITLIST_DATABASE_URL. The table is in
web/db/waitlist.sql. The log-in and sign-up pages stay in the code but
are hidden (404, no links) until AUTH_PAGES_ENABLED is set.

Update, 2026-11-24: the contact form (/contact) is saved the same way,
by web/src/app/[locale]/contact/actions.ts into the contact_messages
table (web/db/contact.sql) in the same database. Its rules are in
web/src/lib/contact.ts, with tests. Everything below applies to it too,
except that a message has no consent column: it is kept only to reply.

## Why

The site needs to go live before the API and its infrastructure are
deployed, and the waitlist and contact messages are the only things it
needs to store. This is an exception to "all business logic lives in
Go"; it covers only those two forms.

## What still holds

- Validation runs on the server (web/src/lib/waitlist.ts, with tests);
  queries are parameterised.
- Each signup stores the consent text the person agreed to, in their
  language, and when.
- Nothing submitted is logged.
- No hard deletes: rows have deleted_at.

## Later

When the API is deployed, move the waitlist behind a Go endpoint and
into the main database in ca-central-1, then retire
WAITLIST_DATABASE_URL. Until then, the waitlist database's location must
be checked against the rule that data stays in Canada
(docs/before-launch.md).
