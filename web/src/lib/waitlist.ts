// The waitlist form's rules: its fields, the values allowed, and turning
// a submitted form into a signup or a list of problems. Kept free of
// server and database code so it can be tested on its own.

export const ORG_TYPES = ["candidate", "riding", "office", "advocacy", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

/** Provinces and territories, by their postal abbreviations. */
export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;
export type Province = (typeof PROVINCES)[number];

export const LOCALES = ["en", "fr"] as const;
export type WaitlistLocale = (typeof LOCALES)[number];

export type Signup = {
  name: string;
  email: string;
  /** Optional: an empty string when left blank. */
  organisation: string;
  orgType: OrgType;
  province: Province;
  locale: WaitlistLocale;
};

export type Field = "name" | "email" | "organisation" | "orgType" | "province" | "consent";
/** What is wrong with a field; each has a message under Waitlist.errors. */
export type Problem = "required" | "tooLong" | "invalidEmail" | "invalidChoice";

export type Parsed = { ok: true; signup: Signup; bot: boolean } | { ok: false; problems: Partial<Record<Field, Problem>> };

const MAX = { name: 120, email: 254, organisation: 160 } as const;
// Deliberately loose: one @, something on each side, a dot in the domain.
// The real check is whether mail arrives.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const oneOf = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

/**
 * Checks a submitted waitlist form. `bot` is true when the hidden
 * "website" field was filled in, which people cannot see; such a signup
 * should be dropped while looking accepted.
 */
export function parseSignup(form: FormData): Parsed {
  const name = text(form, "name");
  const email = text(form, "email");
  const organisation = text(form, "organisation");
  const orgType = text(form, "orgType");
  const province = text(form, "province");
  const locale = text(form, "locale");
  const consent = form.get("consent") === "on";

  const problems: Partial<Record<Field, Problem>> = {};
  if (!name) problems.name = "required";
  else if (name.length > MAX.name) problems.name = "tooLong";

  if (!email) problems.email = "required";
  else if (email.length > MAX.email) problems.email = "tooLong";
  else if (!EMAIL.test(email)) problems.email = "invalidEmail";

  if (organisation.length > MAX.organisation) problems.organisation = "tooLong";

  if (!orgType) problems.orgType = "required";
  else if (!oneOf(ORG_TYPES, orgType)) problems.orgType = "invalidChoice";

  if (!province) problems.province = "required";
  else if (!oneOf(PROVINCES, province)) problems.province = "invalidChoice";

  if (!consent) problems.consent = "required";

  if (Object.keys(problems).length > 0) return { ok: false, problems };

  return {
    ok: true,
    bot: text(form, "website") !== "",
    signup: {
      name,
      email,
      organisation,
      orgType: orgType as OrgType,
      province: province as Province,
      locale: oneOf(LOCALES, locale) ? locale : "en",
    },
  };
}
