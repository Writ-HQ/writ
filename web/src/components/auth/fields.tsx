"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";

const inputStyle =
  "h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[15px] outline-none transition-shadow placeholder:text-faint focus:border-ink focus:ring-3 focus:ring-ink/10";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Shown under the input and read with it. */
  hint?: string;
  /** Shown to the right of the label, such as "Forgot password?". */
  aside?: ReactNode;
};

export function TextField({ label, hint, aside, className = "", ...input }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputStyle} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// A password input with a button that shows what was typed.
export function PasswordField({ label, hint, aside, className = "", ...input }: FieldProps) {
  const t = useTranslations("Auth");
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputStyle} pr-16`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={id}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1.5 my-auto h-8 rounded-[7px] px-2.5 text-[13px] font-medium text-muted hover:bg-ink/5 hover:text-ink"
        >
          {visible ? t("hidePassword") : t("showPassword")}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// The form and its submit button. Sign-in is not connected yet, so
// submitting sends nothing anywhere (and nothing ends up in the address
// bar); after the browser's own checks pass, it says so.
export function AuthForm({ submit, children }: { submit: string; children: ReactNode }) {
  const t = useTranslations("Auth");
  const [tried, setTried] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {children}
      <button
        type="submit"
        className="mt-1 h-11 rounded-full bg-ink text-[15px] font-medium text-white transition-colors hover:bg-ink-soft/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {submit}
      </button>
      <p role="status" className="min-h-5 text-center text-[13px] text-muted">
        {tried ? t("notConnected") : ""}
      </p>
    </form>
  );
}
