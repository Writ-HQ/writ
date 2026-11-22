import type { ReactNode } from "react";

// The page's content width and side margins.
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16 ${className}`}>{children}</div>;
}

// The large, light, tightly set heading used by every section: 40px on a
// 38px line with -0.8px tracking, as in the reference.
export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-[34px] leading-[0.95] font-normal tracking-[-0.02em] text-balance sm:text-[40px] sm:leading-[38px] sm:tracking-[-0.8px] ${className}`}>
      {children}
    </h2>
  );
}
