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

// "Continue with Google" and "Continue with Facebook", above the email
// form. Both companies allow their marks on sign-in buttons that follow
// their branding guidelines: the full-colour Google "G" on a white button
// with the words "Continue with Google", and the Facebook "f" logo with
// "Continue with Facebook". Keep the marks unaltered.
// Not connected yet: in Zitadel these become identity providers.
export function SocialLogin() {
  const t = useTranslations("Auth");
  const [tried, setTried] = useState(false);
  const button =
    "flex h-11 w-full items-center justify-center gap-3 rounded-full border border-line bg-white text-[15px] font-medium transition-colors hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

  return (
    <div>
      <div className="grid gap-3">
        <button type="button" className={button} onClick={() => setTried(true)}>
          <GoogleMark className="size-[18px]" />
          {t("social.google")}
        </button>
        <button type="button" className={button} onClick={() => setTried(true)}>
          <FacebookMark className="size-5" />
          {t("social.facebook")}
        </button>
      </div>
      {tried && (
        <p role="status" className="mt-3 text-center text-[13px] text-muted">
          {t("notConnected")}
        </p>
      )}
      <div className="my-6 flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("social.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#0866FF"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}
