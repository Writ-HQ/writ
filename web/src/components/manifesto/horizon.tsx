"use client";

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { ArrowRight } from '@/components/ui/icons'
import { Pill } from '@/components/ui/pill'
import { runWhileVisible, useReducedMotion } from '@/lib/motion'

/*
  The manifesto's ending, from the tokensupply-landing project: a full screen
  over the colour field (field.tsx), which has risen by the time you get
  here. Small sparkles twinkle, and when the closing words come into view
  they gather out of sparkles, then settle into real, crisp text. The page
  ends here, with no footer.
*/

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3)

function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, maxDpr = 2) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  const w = Math.max(1, rect.width)
  const h = Math.max(1, rect.height)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { w, h }
}

/** A point the sparkles gather to, sampled from the words as drawn. */
type Target = { x: number; y: number }

/** Where each line of the words sits, drawn on a canvas the size of the section, sampled every `gap`px. */
async function sampleWords(section: HTMLElement, lines: HTMLElement[], gap: number): Promise<Target[]> {
  await document.fonts.ready
  const box = section.getBoundingClientRect()
  const w = Math.ceil(box.width)
  const h = Math.ceil(box.height)
  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const c = off.getContext('2d', { willReadFrequently: true })
  if (!c) return []
  c.fillStyle = '#fff'
  c.textBaseline = 'alphabetic'
  let x0 = w
  let y0 = h
  let x1 = 0
  let y1 = 0
  for (const el of lines) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const text = el.textContent ?? ''
    c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing
    const mt = c.measureText(text)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    const ascent = mt.fontBoundingBoxAscent
    const descent = mt.fontBoundingBoxDescent
    const x = r.left - box.left + (parseFloat(cs.paddingLeft) || 0)
    const y = r.top - box.top + (lh - (ascent + descent)) / 2 + ascent
    c.fillText(text, x, y)
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x + mt.width)
    y0 = Math.min(y0, y - ascent)
    y1 = Math.max(y1, y + descent)
  }
  const sx = Math.max(0, Math.floor(x0))
  const sy = Math.max(0, Math.floor(y0))
  const sw = Math.min(w - sx, Math.ceil(x1 - sx))
  const sh = Math.min(h - sy, Math.ceil(y1 - sy))
  if (sw <= 0 || sh <= 0) return []
  const data = c.getImageData(sx, sy, sw, sh).data
  const out: Target[] = []
  for (let y = 0; y < sh; y += gap) {
    for (let x = 0; x < sw; x += gap) {
      if ((data[(y * sw + x) * 4 + 3] ?? 0) > 150) out.push({ x: sx + x, y: sy + y })
    }
  }
  return out
}

type Sparkle = { x: number; y: number; r: number; phase: number; speed: number; drift: number }
type Mote = { x0: number; y0: number; tx: number; ty: number; delay: number; dur: number; size: number; phase: number }

/** When the gathered words give way to the real text, and how long the sparkles take to fade after. */
const SETTLE = 1500
const FADE = 1100

export function Horizon({ section }: { section: RefObject<HTMLElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const words = useRef<HTMLParagraphElement>(null)
  const t = useTranslations('Manifesto.finale')
  const reduce = useReducedMotion()
  const [formed, setFormed] = useState(false)
  const f = { first: t('first'), second: t('second'), action: t('action') }

  useEffect(() => {
    const el = section.current
    const cv = canvas.current
    const text = words.current
    const ctx = cv?.getContext('2d')
    if (!el || !cv || !ctx || !text) return
    const phone = window.matchMedia('(max-width: 767px)').matches
    let size = fitCanvas(cv, ctx, phone ? 1.5 : 2)

    let sparkles: Sparkle[] = []
    const scatter = () => {
      const n = Math.round(Math.min(phone ? 90 : 200, (size.w * size.h) / 7000))
      sparkles = Array.from({ length: n }, () => ({ x: rand(0, size.w), y: rand(size.h * 0.18, size.h), r: rand(0.5, 1.4), phase: rand(0, Math.PI * 2), speed: rand(0.6, 1.6), drift: rand(3, 10) }))
    }
    scatter()

    let motes: Mote[] = []
    let started = 0

    const draw = (now: number) => {
      ctx.clearRect(0, 0, size.w, size.h)
      ctx.fillStyle = '#ffffff'
      const t = now / 1000
      for (const s of sparkles) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * s.speed * 2 + s.phase), 4)
        ctx.globalAlpha = 0.12 + 0.75 * tw
        const y = (((s.y - t * s.drift) % size.h) + size.h) % size.h
        ctx.fillRect(s.x, Math.max(size.h * 0.16, y), s.r * 1.6, s.r * 1.6)
      }
      if (started) {
        const since = now - started
        const fade = 1 - clamp((since - SETTLE) / FADE)
        if (fade > 0) {
          for (const p of motes) {
            const k = easeOutCubic((since - p.delay) / p.dur)
            if (k <= 0) continue
            const x = p.x0 + (p.tx - p.x0) * k
            const y = p.y0 + (p.ty - p.y0) * k
            const tw = 0.55 + 0.45 * Math.sin(now * 0.012 + p.phase)
            ctx.globalAlpha = Math.min(1, k * 1.4) * tw * fade
            ctx.fillRect(x, y, p.size, p.size)
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const stop = runWhileVisible(cv, draw)
    const onResize = () => {
      size = fitCanvas(cv, ctx, phone ? 1.5 : 2)
      scatter()
    }
    window.addEventListener('resize', onResize)

    let done = false
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry?.isIntersecting || done) return
        done = true
        io.disconnect()
        if (reduce) {
          setFormed(true)
          return
        }
        const lines = [...text.querySelectorAll<HTMLElement>('[data-line]')]
        if (!lines[0]) return
        const fontPx = parseFloat(getComputedStyle(lines[0]).fontSize)
        let gap = Math.max(2, Math.round(fontPx / 30))
        let targets = await sampleWords(el, lines, gap)
        const cap = phone ? 2200 : 4200
        while (targets.length > cap) {
          gap += 1
          targets = await sampleWords(el, lines, gap)
        }
        motes = targets.map((p) => {
          const a = rand(0, Math.PI * 2)
          const d = rand(24, phone ? 110 : 180)
          return { tx: p.x + rand(-0.6, 0.6), ty: p.y + rand(-0.6, 0.6), x0: p.x + Math.cos(a) * d, y0: p.y + Math.abs(Math.sin(a)) * d * 0.7 + 30, delay: rand(0, 450), dur: rand(850, 1350), size: rand(1, phone ? 1.6 : 1.9), phase: rand(0, Math.PI * 2) }
        })
        started = performance.now()
        window.setTimeout(() => setFormed(true), SETTLE - 350)
      },
      { threshold: 0.6 },
    )
    io.observe(text)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [reduce, section])

  return (
    <section ref={section} aria-label={`${f.first} ${f.second}`} className="relative z-10 w-full overflow-hidden">
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1440px] flex-col items-center justify-center px-6 pt-28 pb-16 md:px-8 md:pt-32 md:pb-20">
        <p ref={words} className={`w-fit text-white transition-[opacity,filter] duration-[900ms] ease-out [text-shadow:0_0_36px_rgba(255,255,255,0.35),0_0_10px_rgba(255,255,255,0.25)] ${formed ? 'opacity-100 blur-none' : 'opacity-0 blur-[10px]'}`}>
          <span data-line className="block text-[54px] leading-[60px] font-normal tracking-[-0.045em] md:text-[96px] md:leading-[104px]">
            {f.first}
          </span>
          <span data-line className="block pl-[0.9em] text-[56px] leading-[64px] font-normal tracking-[-0.02em] italic md:text-[100px] md:leading-[110px]">
            {f.second}
          </span>
        </p>
        {/* A white button on the colour field, to the waitlist. */}
        <div className={`mt-12 transition-[opacity,transform] duration-700 md:mt-14 ${formed ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          <Pill variant="solid-inverse" size="lg" href="/waitlist">
            {f.action}
            <ArrowRight className="h-4 w-4" />
          </Pill>
        </div>
      </div>
    </section>
  )
}
