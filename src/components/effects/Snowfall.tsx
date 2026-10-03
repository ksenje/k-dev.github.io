import { useEffect, useRef } from 'react'
import { useDeviceTier, useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'

type Flake = {
  x: number
  y: number
  r: number
  fall: number
  sway: number
  swaySpeed: number
  phase: number
  alpha: number
}

/** Counts per device tier. One canvas, no blur, no per particle shadow. */
const COUNTS: Record<0 | 1 | 2, number> = { 0: 20, 1: 38, 2: 62 }

const random = (min: number, max: number) => min + Math.random() * (max - min)

function makeFlake(): Flake {
  const depth = Math.random()
  return {
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + depth * 3.4,
    fall: 5 + depth * 46,
    sway: 6 + depth * 20,
    swaySpeed: random(0.00018, 0.00062),
    phase: random(0, Math.PI * 2),
    alpha: 0.16 + (1 - depth) * 0.24,
  }
}

/**
 * Canvas snowfall. All depths live in a single rAF loop with flat fills, the
 * loop stops while the tab is hidden and reduced motion gets a static frame.
 */
export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tier = useDeviceTier()
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const total = COUNTS[tier]
    let flakes: Flake[] = []
    let width = 0
    let height = 0
    let frame = 0
    let running = true
    let last = performance.now()

    const resize = () => {
      width = Math.max(window.innerWidth, 1)
      height = Math.max(window.innerHeight, 1)
      const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.75)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      flakes = Array.from({ length: total }, makeFlake)
    }

    const draw = (time: number) => {
      if (!running) return
      frame = requestAnimationFrame(draw)
      const dt = Math.min(time - last, 48)
      last = time
      const seconds = dt / 1000

      ctx.clearRect(0, 0, width, height)

      const wind = Math.sin(time * 0.00013) * 15 + Math.sin(time * 0.00037 + 1.4) * 6

      for (const flake of flakes) {
        flake.y += (flake.fall * seconds) / 100
        flake.x += (wind * seconds) / 620 + Math.sin(time * flake.swaySpeed + flake.phase) * ((flake.sway * seconds) / 2600)

        if (flake.y > 1.04) {
          flake.y = -0.04
          flake.x = Math.random()
        }
        if (flake.x > 1.04) flake.x = -0.04
        if (flake.x < -0.04) flake.x = 1.04

        ctx.beginPath()
        ctx.arc(flake.x * width, flake.y * height, flake.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(238, 238, 242, ${flake.alpha})`
        ctx.fill()
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (!running && !reduced) {
        running = true
        last = performance.now()
        frame = requestAnimationFrame(draw)
      }
    }

    const paintStatic = () => {
      ctx.clearRect(0, 0, width, height)
      for (const flake of flakes) {
        ctx.beginPath()
        ctx.arc(flake.x * width, flake.y * height, flake.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(238, 238, 242, ${flake.alpha})`
        ctx.fill()
      }
    }

    resize()
    if (reduced) {
      // Static frame: the effect stays visible without any animation cost.
      paintStatic()
    } else {
      frame = requestAnimationFrame(draw)
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (reduced) paintStatic()
    })
    observer.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [tier, isTouch, reduced])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  )
}