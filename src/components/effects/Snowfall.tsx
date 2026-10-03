import { useEffect, useRef } from 'react'
import { useDeviceTier, useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'

type Layer = 'back' | 'mid' | 'front'

type Flake = {
  x: number
  y: number
  r: number
  fall: number
  sway: number
  swaySpeed: number
  phase: number
  alpha: number
  blur: number
  glow: boolean
}

const CONFIG: Record<
  Layer,
  { count: Record<0 | 1 | 2, number>; radius: [number, number]; fall: [number, number]; alpha: number; blur: number; sway: number; glow: boolean }
> = {
  back: {
    count: { 0: 30, 1: 52, 2: 76 },
    radius: [0.4, 1.05],
    fall: [5, 13],
    alpha: 0.3,
    blur: 0,
    sway: 6,
    glow: false,
  },
  mid: {
    count: { 0: 14, 1: 24, 2: 34 },
    radius: [0.9, 1.9],
    fall: [13, 26],
    alpha: 0.42,
    blur: 0.3,
    sway: 11,
    glow: false,
  },
  front: {
    count: { 0: 5, 1: 8, 2: 11 },
    radius: [2.1, 4.6],
    fall: [28, 52],
    alpha: 0.34,
    blur: 1.4,
    sway: 20,
    glow: true,
  },
}

const random = (min: number, max: number) => min + Math.random() * (max - min)

function makeFlake(config: (typeof CONFIG)[Layer], depth: number): Flake {
  return {
    x: Math.random(),
    y: Math.random(),
    r: random(config.radius[0], config.radius[1]),
    fall: random(config.fall[0], config.fall[1]) * (1 - depth * 0.18),
    sway: random(config.sway * 0.35, config.sway) * (1 + depth * 0.5),
    swaySpeed: random(0.00018, 0.00062),
    phase: random(0, Math.PI * 2),
    alpha: config.alpha * random(0.55, 1),
    blur: config.blur * random(0.4, 1),
    glow: config.glow && Math.random() > 0.55,
  }
}

type SnowfallProps = {
  layer?: Layer
  opacity?: number
}

/**
 * Canvas snowfall. Three depth levels per canvas, wind driven horizontal drift,
 * no DOM particles, rAF loop paused when the tab is hidden.
 */
export function Snowfall({ layer = 'back', opacity = 1 }: SnowfallProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tier = useDeviceTier()
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const config = CONFIG[layer]
    const total = config.count[tier]
    const depth = layer === 'back' ? 0.15 : layer === 'mid' ? 0.45 : 1
    const speedFactor = reduced ? 0.25 : 1

    let flakes: Flake[] = []
    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let running = true
    let last = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(rect.width, 1)
      height = Math.max(rect.height, 1)
      dpr = Math.min(window.devicePixelRatio || 1, layer === 'front' ? 1.5 : 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      flakes = Array.from({ length: total }, () => makeFlake(config, depth))
    }

    const draw = (time: number) => {
      if (!running) return
      frame = requestAnimationFrame(draw)
      const dt = Math.min(time - last, 48)
      last = time
      const seconds = dt / 1000

      ctx.clearRect(0, 0, width, height)

      const wind =
        (Math.sin(time * 0.00013) * 15 + Math.sin(time * 0.00037 + 1.4) * 6) * depth * speedFactor

      for (const flake of flakes) {
        flake.y += (flake.fall * speedFactor * seconds) / 100
        flake.x += (wind * seconds) / 620 + Math.sin(time * flake.swaySpeed + flake.phase) * ((flake.sway * seconds) / 2600)

        if (flake.y > 1.04) {
          flake.y = -0.04
          flake.x = Math.random()
        }
        if (flake.x > 1.04) flake.x = -0.04
        if (flake.x < -0.04) flake.x = 1.04

        const px = flake.x * width
        const py = flake.y * height

        ctx.beginPath()
        ctx.arc(px, py, flake.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(238, 238, 242, ${flake.alpha})`

        if (flake.glow) {
          ctx.shadowBlur = 12 + flake.r * 4
          ctx.shadowColor = 'rgba(226, 226, 232, 0.4)'
        } else if (flake.blur > 0) {
          ctx.shadowBlur = flake.blur * 5
          ctx.shadowColor = 'rgba(214, 214, 220, 0.3)'
        } else {
          ctx.shadowBlur = 0
          ctx.shadowColor = 'transparent'
        }

        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (!running) {
        running = true
        last = performance.now()
        frame = requestAnimationFrame(draw)
      }
    }

    resize()
    ctx.clearRect(0, 0, width, height)
    frame = requestAnimationFrame(draw)

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [layer, tier, reduced])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity, filter: isTouch && layer === 'front' ? 'none' : undefined }}
    />
  )
}