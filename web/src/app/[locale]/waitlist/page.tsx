import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { WaitlistForm } from "@/components/waitlist/waitlist-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Waitlist");
  return { title: `${t("metaTitle")} — Writ` };
}

// Join the waitlist, in the same layout as log-in and sign-up: the sky on
// the left, the form on the right. Signups are saved by the server action
// in ./actions.ts.
export default function WaitlistPage() {
  const t = useTranslations("Waitlist");
  return (
    <AuthShell path="/waitlist" title={t("title")} subtitle={t("subtitle")} footer={t("privacy")}>
      <WaitlistForm />
    </AuthShell>
  );
}
