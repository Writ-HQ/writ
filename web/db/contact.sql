-- Contact form messages, for the database in WAITLIST_DATABASE_URL (the
-- same one as the waitlist; docs/decisions/0006). Run once; safe to run
-- again. Written to match src/lib/contact.ts: change both together.
--
-- Follows the project's data rules where they apply: UUID keys,
-- created_at and updated_at, no hard deletes (deleted_at). No consent
-- column: a message is kept only to reply to it, and is not a sign-up for
-- email (the privacy policy says so).

create table if not exists contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 120),
  email        text not null check (length(email) between 3 and 254),
  organisation text check (length(organisation) <= 160),
  topic        text not null check (topic in ('demo', 'sales', 'support', 'privacy', 'press', 'other')),
  message      text not null check (length(message) between 1 and 5000),
  locale       text not null check (locale in ('en', 'fr')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- Newest first, for whoever answers them.
create index if not exists contact_messages_created_at_idx
  on contact_messages (created_at desc)
  where deleted_at is null;
