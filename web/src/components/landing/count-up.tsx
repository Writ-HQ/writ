"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/motion";

// A figure such as "100%" or "100 %" that counts up from zero when it
// scrolls into view, once. Whatever surrounds the number (a % sign, a
// space) stays put. The final value is reserved underneath so nothing
// beside it moves while it counts, and screen readers get the final value.

const DURATION = 1400;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({ value }: { value: string }) {
  const match = /^(\D*)(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[2]) : 0;
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match || reduce) return;
    let raf = requestAnimationFrame(() => setCurrent(0));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const k = Math.min(1, (now - start) / DURATION);
          setCurrent(Math.round(target * easeOut(k)));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // match is derived from value; target covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce]);

  if (!match) return <>{value}</>;
  const shown = current == null ? value : `${match[1]}${current}${match[3]}`;
  return (
    <span ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-grid tabular-nums">
        <span className="invisible [grid-area:1/1]">{value}</span>
        <span className="[grid-area:1/1]">{shown}</span>
      </span>
    </span>
  );
}
