import "server-only";

import postgres from "postgres";

import type { ContactMessage } from "./contact";
import type { Signup } from "./waitlist";

// Saves waitlist signups and contact form messages to the database named
// by WAITLIST_DATABASE_URL. The tables are created by web/db/waitlist.sql
// and web/db/contact.sql. This is the one place the web app writes to a
// database itself; see docs/decisions/0006.

let sql: postgres.Sql | null = null;

function client() {
  const url = process.env.WAITLIST_DATABASE_URL;
  if (!url) return null;
  // One connection per server instance is plenty for a form, and
  // prepared statements are off so a pooled (PgBouncer) URL works too.
  sql ??= postgres(url, { max: 1, prepare: false, idle_timeout: 20 });
  return sql;
}

export function waitlistConfigured() {
  return Boolean(process.env.WAITLIST_DATABASE_URL);
}

/**
 * Records a signup with the consent text the person agreed to. Signing up
 * twice with the same address keeps the first signup and is not an error,
 * so the form never reveals whether an address is already on the list.
 */
export async function saveSignup(signup: Signup, consentText: string) {
  const db = client();
  if (!db) throw new Error("WAITLIST_DATABASE_URL is not set");
  await db`
    insert into waitlist_signups (name, email, organisation, organisation_type, province, locale, consent_text, consented_at)
    values (${signup.name}, ${signup.email}, ${signup.organisation || null}, ${signup.orgType}, ${signup.province},
            ${signup.locale}, ${consentText}, now())
    on conflict ((lower(email))) where deleted_at is null do nothing
  `;
}

/** Records a message from the contact form, to be answered by email. */
export async function saveContactMessage(m: ContactMessage) {
  const db = client();
  if (!db) throw new Error("WAITLIST_DATABASE_URL is not set");
  await db`
    insert into contact_messages (name, email, organisation, topic, message, locale)
    values (${m.name}, ${m.email}, ${m.organisation || null}, ${m.topic}, ${m.message}, ${m.locale})
  `;
}
