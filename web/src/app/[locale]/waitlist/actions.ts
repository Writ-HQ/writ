"use server";

import { getTranslations } from "next-intl/server";

import { parseSignup, type Field, type Problem } from "@/lib/waitlist";
import { saveSignup, waitlistConfigured } from "@/lib/waitlist-db";

export type WaitlistState =
  | { status: "idle" }
  | { status: "done" }
  | { status: "invalid"; problems: Partial<Record<Field, Problem>> }
  | { status: "error" };

/**
 * Handles the waitlist form. Never logs what was submitted: names and
 * email addresses are personal data.
 */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = parseSignup(form);
  if (!parsed.ok) return { status: "invalid", problems: parsed.problems };
  // Filled in by a bot: look accepted, save nothing.
  if (parsed.bot) return { status: "done" };
  if (!waitlistConfigured()) {
    console.error("waitlist: WAITLIST_DATABASE_URL is not set");
    return { status: "error" };
  }

  // The consent text is stored exactly as it was shown, in the language
  // the person read it in.
  const t = await getTranslations({ locale: parsed.signup.locale, namespace: "Waitlist" });
  try {
    await saveSignup(parsed.signup, t("consent"));
  } catch (err) {
    console.error("waitlist: could not save a signup", err instanceof Error ? err.message : "unknown error");
    return { status: "error" };
  }
  return { status: "done" };
}
