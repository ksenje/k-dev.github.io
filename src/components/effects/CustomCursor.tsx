import { useEffect, useRef } from 'react'
import { useSharedPointer } from '../../lib/pointer'
import { useIsTouch } from '../../hooks/useEnvironment'

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, summary, [data-cursor="hover"]'

/** Minimal glowing dot that grows over interactive elements. */
export function CustomCursor() {
  const isTouch = useIsTouch()
  const pointer = useSharedPointer()
  const dotRef = useRef<HTMLDivElement | null>(null)
  const haloRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isTouch) return
    const dot = dotRef.current
    const halo = haloRef.current
    if (!dot || !halo) return

    let x = -100
    let y = -100
    let hx = -100
    let hy = -100
    let scale = 1
    let targetScale = 1
    let raf = 0

    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null
      targetScale = target?.closest?.(INTERACTIVE) ? 2.6 : 1
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const p = pointer.current
      if (p.x < -1000) return
      x += (p.x - x) * 0.42
      y += (p.y - y) * 0.42
      hx += (p.x - hx) * 0.16
      hy += (p.y - hy) * 0.16
      scale += (targetScale - scale) * 0.18

      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0) translate(-50%, -50%) scale(${(0.6 + scale * 0.4).toFixed(3)})`
      halo.style.opacity = scale > 1.4 ? '0.75' : '0.4'
    }

    window.addEventListener('pointerover', onOver, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointerover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [isTouch, pointer])

  if (isTouch) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[120] hidden lg:block">
      <div
        ref={haloRef}
        className="absolute top-0 left-0 rounded-full will-transform"
        style={{
          width: 26,
          height: 26,
          background: 'radial-gradient(circle, rgba(236,238,242,0.22) 0%, transparent 70%)',
          opacity: 0.4,
        }}
      />
      <div
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full will-transform"
        style={{
          width: 6,
          height: 6,
          background: '#f2f2f4',
          boxShadow: '0 0 12px rgba(226,226,232,0.7)',
        }}
      />
    </div>
  )
}