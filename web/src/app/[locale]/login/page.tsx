import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm, PasswordField, SocialLogin, TextField } from "@/components/auth/fields";
import { Link } from "@/i18n/navigation";
import { authPagesEnabled } from "@/lib/flags";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return { title: `${t("metaTitle")} — Writ` };
}

// Log in. The layout is in place; signing in goes through Zitadel and is
// not connected yet.
export default function LoginPage() {
  const t = useTranslations("Auth.login");
  const auth = useTranslations("Auth");
  // Hidden while Writ takes waitlist signups (src/lib/flags.ts).
  if (!authPagesEnabled) notFound();

  return (
    <AuthShell
      path="/login"
      title={t("title")}
      subtitle={t("subtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-ink underline-offset-4 hover:underline">
            {t("signup")}
          </Link>
        </>
      }
    >
      <SocialLogin />
      <AuthForm submit={t("submit")}>
        <TextField label={auth("email")} name="email" type="email" autoComplete="username" placeholder={auth("emailPlaceholder")} required />
        <PasswordField
          label={auth("password")}
          name="password"
          autoComplete="current-password"
          required
          aside={
            <button type="button" className="text-[13px] text-muted hover:text-ink">
              {t("forgot")}
            </button>
          }
        />
      </AuthForm>
      <p className="mt-2 text-[13px] text-muted">{t("mfaNote")}</p>
    </AuthShell>
  );
}
