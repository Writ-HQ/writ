"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useId, type ReactNode } from "react";

import { joinWaitlist, type WaitlistState } from "@/app/[locale]/waitlist/actions";
import { inputStyle } from "@/components/auth/fields";
import { Check } from "@/components/ui/icons";
import { ORG_TYPES, PROVINCES, type Field } from "@/lib/waitlist";

// The waitlist form. The browser checks required fields first; the server
// checks everything again and its problems show under each field. Once
// saved, the form gives way to a thank-you. Row and selectStyle are shared
// with the contact form.

export function Row({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: string;
  error?: string;
  children: (a: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        {optional && <span className="text-[13px] font-normal text-muted">{optional}</span>}
      </label>
      {children({ id, describedBy: error ? errorId : undefined, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export const selectStyle = `${inputStyle} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%20fill='none'%20stroke='%23737373'%20stroke-width='1.5'%3E%3Cpath%20d='M4%206l4%204%204-4'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`;

export function WaitlistForm() {
  const t = useTranslations("Waitlist");
  const locale = useLocale();
  const [state, action, pending] = useActionState<WaitlistState, FormData>(joinWaitlist, { status: "idle" });

  if (state.status === "done") {
    return (
      <div role="status" className="rounded-[14px] bg-panel p-6 ring-1 ring-line">
        <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white">
          <Check className="size-4" strokeWidth={2.25} />
        </span>
        <p className="mt-4 text-[20px] leading-7 font-medium tracking-[-0.02em]">{t("done.title")}</p>
        <p className="mt-1.5 text-[15px] leading-[22px] text-muted">{t("done.body")}</p>
      </div>
    );
  }

  const problems = state.status === "invalid" ? state.problems : {};
  const error = (f: Field) => (problems[f] ? t(`errors.${problems[f]}`) : undefined);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Row label={t("name")} error={error("name")}>
        {(a) => <input id={a.id} name="name" autoComplete="name" required maxLength={120} aria-invalid={a.invalid || undefined} aria-describedby={a.describedBy} className={inputStyle} />}
      </Row>
      <Row label={t("email")} error={error("email")}>
        {(a) => (
          <input
            id={a.id}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            required
            maxLength={254}
            aria-invalid={a.invalid || undefined}
            aria-describedby={a.describedBy}
            className={inputStyle}
          />
        )}
      </Row>
      <Row label={t("organisation")} optional={t("optional")} error={error("organisation")}>
        {(a) => <input id={a.id} name="organisation" autoComplete="organization" maxLength={160} aria-invalid={a.invalid || undefined} aria-describedby={a.describedBy} className={inputStyle} />}
      </Row>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label={t("orgType")} error={error("orgType")}>
          {(a) => (
            <select id={a.id} name="orgType" required defaultValue="" aria-invalid={a.invalid || undefined} aria-describedby={a.describedBy} className={selectStyle}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {ORG_TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`orgTypes.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Row>
        <Row label={t("province")} error={error("province")}>
          {(a) => (
            <select id={a.id} name="province" required defaultValue="" aria-invalid={a.invalid || undefined} aria-describedby={a.describedBy} className={selectStyle}>
              <option value="" disabled>
                {t("choose")}
              </option>
              {PROVINCES.map((k) => (
                <option key={k} value={k}>
                  {t(`provinces.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Row>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-[13px] leading-5 text-muted">
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={Boolean(problems.consent) || undefined}
            aria-describedby={problems.consent ? "consent-error" : undefined}
            className="mt-0.5 size-4 shrink-0 accent-ink"
          />
          {t("consent")}
        </label>
        {problems.consent && (
          <p id="consent-error" className="mt-1.5 text-[13px] text-bad">
            {t("errors.consent")}
          </p>
        )}
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-[10px] bg-bad/[0.06] px-3.5 py-2.5 text-[13px] text-bad">
          {t("errors.server")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-11 items-center justify-center rounded-full bg-ink text-[15px] font-medium text-white transition-colors hover:bg-ink-soft/85 disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
