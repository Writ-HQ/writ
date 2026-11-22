import type { ReactNode } from "react";

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
   * Where the button goes. Left out for now: the calls to action are not
   * wired to anything yet, so they render as buttons that do nothing.
   */
  href?: string;
  className?: string;
};

// The rounded "pill" button used for every call to action.
export function Pill({ children, variant = "solid", size = "md", href, className = "" }: Props) {
  const classes = `inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes}>
      {children}
    </button>
  );
}
