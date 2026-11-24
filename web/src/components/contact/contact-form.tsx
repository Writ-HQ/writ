"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { sendContactMessage, type ContactState } from "@/app/[locale]/contact/actions";
import { inputStyle } from "@/components/auth/fields";
import { Check } from "@/components/ui/icons";
import { Row, selectStyle } from "@/components/waitlist/waitlist-form";
import { CONTACT_MAX, TOPICS, type ContactField, type Topic } from "@/lib/contact";

// The contact form, built like the waitlist form: the browser checks
// required fields first, the server checks everything again and its
// problems show under each field, and once saved the form gives way to a
// thank-you. A link can choose the topic (/contact?topic=demo).

export function ContactForm({ topic }: { topic?: Topic }) {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });

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
  const error = (f: ContactField) => (problems[f] ? t(`errors.${problems[f]}`) : undefined);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label={t("name")} error={error("name")}>
          {(a) => (
            <input
              id={a.id}
              name="name"
              autoComplete="name"
              required
              maxLength={CONTACT_MAX.name}
              aria-invalid={a.invalid || undefined}
              aria-describedby={a.describedBy}
              className={inputStyle}
            />
          )}
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
              maxLength={CONTACT_MAX.email}
              aria-invalid={a.invalid || undefined}
              aria-describedby={a.describedBy}
              className={inputStyle}
            />
          )}
        </Row>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row label={t("organisation")} optional={t("optional")} error={error("organisation")}>
          {(a) => (
            <input
              id={a.id}
              name="organisation"
              autoComplete="organization"
              maxLength={CONTACT_MAX.organisation}
              aria-invalid={a.invalid || undefined}
              aria-describedby={a.describedBy}
              className={inputStyle}
            />
          )}
        </Row>
        <Row label={t("topic")} error={error("topic")}>
          {(a) => (
            <select
              id={a.id}
              name="topic"
              required
              defaultValue={topic ?? ""}
              aria-invalid={a.invalid || undefined}
              aria-describedby={a.describedBy}
              className={selectStyle}
            >
              <option value="" disabled>
                {t("choose")}
              </option>
              {TOPICS.map((k) => (
                <option key={k} value={k}>
                  {t(`topics.${k}`)}
                </option>
              ))}
            </select>
          )}
        </Row>
      </div>
      <Row label={t("message")} error={error("message")}>
        {(a) => (
          <textarea
            id={a.id}
            name="message"
            required
            rows={6}
            maxLength={CONTACT_MAX.message}
            placeholder={t("messagePlaceholder")}
            aria-invalid={a.invalid || undefined}
            aria-describedby={a.describedBy}
            className={`${inputStyle} h-auto resize-y py-3 leading-[22px]`}
          />
        )}
      </Row>

      {state.status === "error" && (
        <p role="alert" className="rounded-[10px] bg-bad/[0.06] px-3.5 py-2.5 text-[13px] text-bad">
          {t("errors.server")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-11 items-center justify-center rounded-full bg-ink px-6 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft/85 disabled:opacity-60 sm:justify-self-start"
      >
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
