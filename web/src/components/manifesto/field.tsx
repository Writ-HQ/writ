"use client";

import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from '@/lib/motion'

/*
  The manifesto's colour field, from the tokensupply-landing project, in
  Writ's sky blue (the --field-* tokens in globals.css).

  - A gradient layer pinned to the screen and faded at its top. It starts 80% below the screen, so only a faint glow
    shows along the bottom; it drifts up to 40% as you read, then rises to cover the screen as the ending scrolls in.
    Its four colours sit on a 400% canvas whose angle keeps turning, so they slowly sweep across.
  - A soft glow at the bottom centre, the horizon: faint at the top of the page, brighter as you read. It wobbles a
    little and sinks away under the colour as the ending arrives.
*/

/** Degrees the gradient turns per second. */
const TURN = 22

/** The horizon's glow: one wide ellipse at three soft blurs, on a canvas large enough that no blur is clipped. */
const GLOWS = [
  { rx: 440, ry: 44, blur: 28, opacity: 0.5 },
  { rx: 480, ry: 56, blur: 48, opacity: 0.5 },
  { rx: 520, ry: 64, blur: 72, opacity: 0.45 },
]

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/** The field behind the whole manifesto page: `reading` is everything above the ending, `ending` the closing section. */
export function Field({ reading, ending }: { reading: RefObject<HTMLElement | null>; ending: RefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLDivElement>(null)
  const rim = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    let raf = 0
    let lift = 80
    let lastAngle = 0
    let angle = 200
    const frame = (now: number) => {
      const r = reading.current?.getBoundingClientRect()
      const e = ending.current?.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 at the top of the page, 1 when the reading ends and the ending starts to come in.
      const read = r ? clamp(-r.top / Math.max(1, r.height - vh)) : 0
      // 0 when the ending's top reaches the bottom of the screen, 1 at the end of the page.
      const arrival = e ? clamp((vh - e.top) / Math.max(1, e.height)) : 0
      // 80% below the screen at the top, 40% by the time the ending starts, 0% at its end; eased like a spring.
      const target = arrival > 0 ? 40 * (1 - arrival) : 80 - 40 * read
      lift += (target - lift) * (reduce ? 1 : 0.14)
      if (!reduce && now - lastAngle > 40) {
        lastAngle = now
        angle = (200 + (now / 1000) * TURN) % 360
      }
      const clear = 10 * (1 - arrival)
      const solid = 100 - 62 * arrival
      const el = layer.current
      if (el) {
        el.style.transform = `translateY(${lift}%)`
        const mask = `linear-gradient(to bottom, transparent ${clear}%, black ${solid}%)`
        el.style.maskImage = mask
        el.style.webkitMaskImage = mask
        el.style.backgroundImage = `linear-gradient(${angle}deg, var(--field-1) 0%, var(--field-2) 25%, var(--field-3) 50%, var(--field-4) 75%)`
      }
      const glow = rim.current
      if (glow) {
        const wobble = reduce ? 0 : 2.6 * Math.sin((now / 1000) * ((2 * Math.PI) / 7.5))
        const opacity = read < 0.6 ? 0.35 + (0.15 * read) / 0.6 : 0.5 + (0.35 * (read - 0.6)) / 0.4
        glow.style.transform = `translateY(${72 * arrival}px) rotate(${wobble}deg)`
        glow.style.opacity = String(opacity)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reading, ending, reduce])

  return (
    <>
      <div ref={rim} aria-hidden="true" className="pointer-events-none fixed bottom-0 left-[calc(50%-480px)] z-0 h-24 w-[960px] will-change-transform">
        {/* 1500×600, centred on the 960×96 box: room for the widest blur on every side. */}
        <svg width="1500" height="600" viewBox="0 0 1500 600" fill="none" className="absolute top-[-252px] left-[-270px]">
          <defs>
            {GLOWS.map((g, i) => (
              <filter key={g.blur} id={`field-glow-${i}`} x="0" y="0" width="1500" height="600" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={g.blur} />
              </filter>
            ))}
          </defs>
          {GLOWS.map((g, i) => (
            <g key={g.blur} opacity={g.opacity} filter={`url(#field-glow-${i})`}>
              <ellipse cx="750" cy="300" rx={g.rx} ry={g.ry} style={{ fill: 'var(--field-rim)' }} />
            </g>
          ))}
        </svg>
      </div>
      <div ref={layer} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 origin-bottom" style={{ transform: 'translateY(80%)', backgroundSize: '400% 400%' }} />
    </>
  )
}
