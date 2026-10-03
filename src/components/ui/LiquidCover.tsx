import { useEffect, useRef } from 'react'
import { usePlayer } from '../music/PlayerProvider'
import { useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'

type Blob = {
  bx: number
  by: number
  r: number
  driftX: number
  driftY: number
  speedX: number
  speedY: number
  phaseX: number
  phaseY: number
  band: number
}

/**
 * Fluid blobs whose size, brightness and position follow the audio bands of
 * the playing track. Purely additive light, so it reads as liquid mercury
 * rather than an equalizer.
 */
const BLOBS: Blob[] = [
  { bx: 0.28, by: 0.44, r: 0.6, driftX: 0.14, driftY: 0.22, speedX: 0.23, speedY: 0.19, phaseX: 0.0, phaseY: 1.3, band: 0 },
  { bx: 0.72, by: 0.38, r: 0.56, driftX: 0.16, driftY: 0.2, speedX: 0.19, speedY: 0.27, phaseX: 2.1, phaseY: 0.4, band: 1 },
  { bx: 0.5, by: 0.62, r: 0.66, driftX: 0.12, driftY: 0.24, speedX: 0.15, speedY: 0.22, phaseX: 3.4, phaseY: 2.6, band: 0 },
  { bx: 0.2, by: 0.66, r: 0.44, driftX: 0.18, driftY: 0.18, speedX: 0.31, speedY: 0.17, phaseX: 1.1, phaseY: 4.2, band: 2 },
  { bx: 0.82, by: 0.6, r: 0.46, driftX: 0.17, driftY: 0.19, speedX: 0.27, speedY: 0.24, phaseX: 5.0, phaseY: 1.8, band: 2 },
  { bx: 0.46, by: 0.26, r: 0.4, driftX: 0.2, driftY: 0.16, speedX: 0.22, speedY: 0.3, phaseX: 0.7, phaseY: 3.1, band: 1 },
  { bx: 0.62, by: 0.74, r: 0.5, driftX: 0.13, driftY: 0.21, speedX: 0.25, speedY: 0.16, phaseX: 4.3, phaseY: 0.9, band: 0 },
]

export function LiquidCover() {
  const { analyserRef } = usePlayer()
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.25 : 1.75)
    let width = 1
    let height = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    let onScreen = true
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting }, { rootMargin: '80px' })
    io.observe(canvas)

    const blobs = isTouch ? BLOBS.slice(0, 5) : BLOBS
    const bands = [0, 0, 0]
    let data: Uint8Array<ArrayBuffer> | null = null
    let dataOwner: AnalyserNode | null = null

    const sampleBands = () => {
      const analyser = analyserRef.current
      if (!analyser) {
        bands[0] *= 0.94
        bands[1] *= 0.94
        bands[2] *= 0.94
        return
      }
      if (analyser !== dataOwner) {
        data = new Uint8Array(analyser.frequencyBinCount)
        dataOwner = analyser
      }
      const buffer = data as Uint8Array<ArrayBuffer>
      analyser.getByteFrequencyData(buffer)
      const bins = buffer.length
      const lowEnd = Math.max(1, Math.floor(bins * 0.06))
      const midEnd = Math.max(lowEnd + 1, Math.floor(bins * 0.28))
      const highEnd = Math.max(midEnd + 1, Math.floor(bins * 0.6))
      const avg = (from: number, to: number) => {
        let sum = 0
        for (let i = from; i < to; i++) sum += buffer[i]
        return sum / (to - from) / 255
      }
      bands[0] += (avg(0, lowEnd) - bands[0]) * 0.3
      bands[1] += (avg(lowEnd, midEnd) - bands[1]) * 0.25
      bands[2] += (avg(midEnd, highEnd) - bands[2]) * 0.2
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      const min = Math.min(width, height)
      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i]
        const energy = bands[blob.band] ?? 0
        const cx = (blob.bx + Math.sin(t * blob.speedX + blob.phaseX) * blob.driftX + Math.cos(t * 0.11 + i) * 0.03) * width
        const cy = (blob.by + Math.cos(t * blob.speedY + blob.phaseY) * blob.driftY) * height
        const radius = min * blob.r * (0.72 + energy * 1.5)
        const alpha = 0.15 + energy * 0.32
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        grad.addColorStop(0, `rgba(240, 241, 245, ${alpha})`)
        grad.addColorStop(0.45, `rgba(201, 196, 214, ${alpha * 0.55})`)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      // Soft vignette keeps the liquid pooled inside the frame.
      ctx.globalCompositeOperation = 'source-over'
      const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.62)
      vignette.addColorStop(0, 'rgba(4, 4, 6, 0)')
      vignette.addColorStop(1, 'rgba(4, 4, 6, 0.55)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)
    }

    if (reduced) {
      draw(0)
      return () => {
        resizeObserver.disconnect()
        io.disconnect()
      }
    }

    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!onScreen) return
      const t = now / 1000
      if (t - last < 0.033) return
      last = t
      sampleBands()
      draw(t)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      io.disconnect()
    }
  }, [analyserRef, isTouch, reduced])

  return <canvas ref={canvasRef} className="cover-canvas" aria-hidden="true" />
}
