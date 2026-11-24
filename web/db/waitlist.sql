-- The waitlist table, for the database in WAITLIST_DATABASE_URL. Run once;
-- safe to run again. Written to match src/lib/waitlist.ts: change both
-- together.
--
-- Follows the project's data rules where they apply: UUID keys,
-- created_at and updated_at, no hard deletes (deleted_at), and the
-- consent each person gave, word for word, with when they gave it.

create table if not exists waitlist_signups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(name) between 1 and 120),
  email             text not null check (length(email) between 3 and 254),
  organisation      text check (length(organisation) <= 160),
  organisation_type text not null check (organisation_type in ('candidate', 'riding', 'office', 'advocacy', 'other')),
  province          text not null check (province in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  locale            text not null check (locale in ('en', 'fr')),
  consent_text      text not null,
  consented_at      timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- One live signup per address, whatever its case.
create unique index if not exists waitlist_signups_email_key
  on waitlist_signups (lower(email))
  where deleted_at is null;
