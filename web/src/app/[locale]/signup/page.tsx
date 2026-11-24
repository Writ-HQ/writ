import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm, PasswordField, SocialLogin, TextField } from "@/components/auth/fields";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signup");
  return { title: `${t("metaTitle")} — Writ` };
}

// Create an account. The layout is in place; accounts are created in
// Zitadel and this form is not connected yet.
export default function SignupPage() {
  const t = useTranslations("Auth.signup");
  const auth = useTranslations("Auth");

  return (
    <AuthShell
      path="/signup"
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            {t("login")}
          </Link>
        </>
      }
    >
      <SocialLogin />
      <AuthForm submit={t("submit")}>
        <TextField label={t("name")} name="name" autoComplete="name" required />
        <TextField label={t("email")} name="email" type="email" autoComplete="email" placeholder={auth("emailPlaceholder")} required />
        <TextField label={t("organisation")} name="organisation" autoComplete="organization" hint={t("organisationHint")} required />
        <PasswordField label={auth("password")} name="password" autoComplete="new-password" minLength={12} hint={t("passwordHint")} required />
        <label className="flex items-start gap-2.5 text-[13px] leading-5 text-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-ink" />
          {t("terms")}
        </label>
      </AuthForm>
    </AuthShell>
  );
}
