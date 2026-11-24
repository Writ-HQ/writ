"use server";

import { parseContact, type ContactField, type ContactProblem } from "@/lib/contact";
import { saveContactMessage, waitlistConfigured } from "@/lib/waitlist-db";

export type ContactState =
  | { status: "idle" }
  | { status: "done" }
  | { status: "invalid"; problems: Partial<Record<ContactField, ContactProblem>> }
  | { status: "error" };

/**
 * Handles the contact form. Never logs what was submitted: names, email
 * addresses and messages are personal data.
 */
export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const parsed = parseContact(form);
  if (!parsed.ok) return { status: "invalid", problems: parsed.problems };
  // Filled in by a bot: look sent, save nothing.
  if (parsed.bot) return { status: "done" };
  if (!waitlistConfigured()) {
    console.error("contact: WAITLIST_DATABASE_URL is not set");
    return { status: "error" };
  }
  try {
    await saveContactMessage(parsed.message);
  } catch (err) {
    console.error("contact: could not save a message", err instanceof Error ? err.message : "unknown error");
    return { status: "error" };
  }
  return { status: "done" };
}
