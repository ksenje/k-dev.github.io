import { useEffect, useRef } from 'react'
import { useSharedPointer } from '../../lib/pointer'
import { useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'

/** Large cold light source that follows the pointer across the whole page. */
export function CursorLight() {
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()
  const pointer = useSharedPointer()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isTouch || reduced) return
    const node = ref.current
    if (!node) return

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let raf = 0
    let seen = false

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const target = pointer.current
      if (target.x < -1000) return
      seen = true
      x += (target.x - x) * 0.075
      y += (target.y - y) * 0.075
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      if (!seen) node.style.opacity = '0'
    }
  }, [isTouch, reduced, pointer])

  if (isTouch || reduced) return null

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[1] h-0 w-0 overflow-hidden will-transform"
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 'min(1100px, 120vw)',
          height: 'min(1100px, 120vw)',
          background:
            'radial-gradient(circle, rgba(232,232,236,0.075) 0%, rgba(180,176,192,0.045) 34%, rgba(255,255,255,0.015) 54%, transparent 74%)',
        }}
      />
    </div>
  )
}