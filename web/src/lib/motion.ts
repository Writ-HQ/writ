"use client";

import { useSyncExternalStore } from "react";

// Motion helpers: honour the system's reduced-motion setting, and run an
// animation loop only while its element is on screen and the tab is visible.
// From the tokensupply-landing project.

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when the visitor has asked their system for less motion. */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);

/** Calls `frame` on every animation frame while `el` is on screen; returns a function that stops it. */
export function runWhileVisible(el: Element, frame: (now: number) => void) {
  let raf = 0;
  let onScreen = false;
  const loop = (now: number) => {
    frame(now);
    raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    const run = onScreen && document.visibilityState === "visible";
    if (run && !raf) raf = requestAnimationFrame(loop);
    if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
    sync();
  });
  io.observe(el);
  document.addEventListener("visibilitychange", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}
