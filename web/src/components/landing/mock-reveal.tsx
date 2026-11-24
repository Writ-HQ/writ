"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Plays the entrance of a product mock-up when it scrolls into view, once:
// the card rises in, its rows follow one by one, then it floats gently.
// The motion itself is CSS (.mock-reveal in globals.css). The wrapper is
// "armed" only once this script runs, so without JavaScript the card
// simply shows; with reduced motion the CSS keeps it still.

export function MockReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.dataset.armed = "";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.dataset.shown = "";
        io.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="mock-reveal">
      {children}
    </div>
  );
}
