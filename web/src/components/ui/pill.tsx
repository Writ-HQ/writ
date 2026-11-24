import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

const variants = {
  solid: "bg-ink text-white hover:bg-ink-soft/85",
  outline: "border border-ink text-ink hover:bg-ink hover:text-white",
  slate: "bg-slate text-white hover:bg-slate/85",
  "outline-light": "border border-ink/30 text-ink hover:border-ink",
  "solid-inverse": "bg-white text-ink hover:bg-white/85",
  "outline-inverse": "border border-white text-white hover:bg-white hover:text-ink",
} as const;

// From the reference: navbar buttons are 32px tall with 4px/16px padding
// and 14px text; the hero button is 48px tall with 12px/20px padding and
// 16px text.
const sizes = {
  sm: "h-8 px-4 text-sm leading-[18px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-5 text-base leading-[18px]",
} as const;

type Props = {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /**
   * Where the button goes, as a path without the locale ("/signup"); the
   * link keeps the visitor's language. Left out, it renders as a button
   * that does nothing yet.
   */
  href?: string;
  className?: string;
};

// The rounded "pill" button used for every call to action.
export function Pill({ children, variant = "solid", size = "md", href, className = "" }: Props) {
  const classes = `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
