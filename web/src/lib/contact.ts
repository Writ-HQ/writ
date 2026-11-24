// The contact form's rules: its fields, the topics, and turning a
// submitted form into a message or a list of problems. Kept free of server
// and database code so it can be tested on its own, like waitlist.ts.

export const TOPICS = ["demo", "sales", "support", "privacy", "press", "other"] as const;
export type Topic = (typeof TOPICS)[number];

export const CONTACT_LOCALES = ["en", "fr"] as const;
export type ContactLocale = (typeof CONTACT_LOCALES)[number];

export type ContactMessage = {
  name: string;
  email: string;
  /** Optional: an empty string when left blank. */
  organisation: string;
  topic: Topic;
  message: string;
  locale: ContactLocale;
};

export type ContactField = "name" | "email" | "organisation" | "topic" | "message";
/** What is wrong with a field; each has a message under Contact.errors. */
export type ContactProblem = "required" | "tooLong" | "invalidEmail" | "invalidChoice";

export type ParsedContact =
  | { ok: true; message: ContactMessage; bot: boolean }
  | { ok: false; problems: Partial<Record<ContactField, ContactProblem>> };

export const CONTACT_MAX = { name: 120, email: 254, organisation: 160, message: 5000 } as const;
// Deliberately loose, as on the waitlist: the real check is whether mail arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const oneOf = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

/** A topic from a link (/contact?topic=demo), or undefined if it is not one of ours. */
export function topicFrom(value: string | string[] | undefined): Topic | undefined {
  return typeof value === "string" && oneOf(TOPICS, value) ? value : undefined;
}

/**
 * Checks a submitted contact form. `bot` is true when the hidden "website"
 * field was filled in, which people cannot see; such a message should be
 * dropped while looking sent.
 */
export function parseContact(form: FormData): ParsedContact {
  const name = text(form, "name");
  const email = text(form, "email");
  const organisation = text(form, "organisation");
  const topic = text(form, "topic");
  const message = text(form, "message");
  const locale = text(form, "locale");

  const problems: Partial<Record<ContactField, ContactProblem>> = {};
  if (!name) problems.name = "required";
  else if (name.length > CONTACT_MAX.name) problems.name = "tooLong";

  if (!email) problems.email = "required";
  else if (email.length > CONTACT_MAX.email) problems.email = "tooLong";
  else if (!EMAIL.test(email)) problems.email = "invalidEmail";

  if (organisation.length > CONTACT_MAX.organisation) problems.organisation = "tooLong";

  if (!topic) problems.topic = "required";
  else if (!oneOf(TOPICS, topic)) problems.topic = "invalidChoice";

  if (!message) problems.message = "required";
  else if (message.length > CONTACT_MAX.message) problems.message = "tooLong";

  if (Object.keys(problems).length > 0) return { ok: false, problems };

  return {
    ok: true,
    bot: text(form, "website") !== "",
    message: {
      name,
      email,
      organisation,
      topic: topic as Topic,
      message,
      locale: oneOf(CONTACT_LOCALES, locale) ? locale : "en",
    },
  };
}
