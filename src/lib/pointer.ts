import { useEffect, useRef } from 'react'
import { useIsTouch, usePrefersReducedMotion } from '../hooks/useEnvironment'

type Polar = { x: number; y: number }

/**
 * Shared pointer position in a single rAF loop.
 * Reads are cheap: every consumer samples the same mutable object.
 */
const pointer: Polar = { x: -9999, y: -9999 }
const subscribers = new Set<() => void>()
let rafId = 0
let pending = false
let latest: Polar = { x: -9999, y: -9999 }

function pump() {
  rafId = 0
  pending = false
  pointer.x = latest.x
  pointer.y = latest.y
  for (const notify of subscribers) notify()
}

function schedule() {
  if (pending) return
  pending = true
  rafId = requestAnimationFrame(pump)
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return
      latest = { x: event.clientX, y: event.clientY }
      schedule()
    },
    { passive: true },
  )
}

export function useSharedPointer(): { current: Polar } {
  const ref = useRef(pointer)

  useEffect(() => {
    const notify = () => {
      ref.current = pointer
    }
    subscribers.add(notify)
    return () => {
      subscribers.delete(notify)
      if (subscribers.size === 0 && rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
        pending = false
      }
    }
  }, [])

  return ref
}

/**
 * Enables the custom cursor class on <html> for fine pointer devices only.
 */
export function useCustomCursorEnabled(): void {
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const root = document.documentElement
    const enabled = !isTouch
    root.classList.toggle('custom-cursor', enabled)
    if (!enabled) root.classList.remove('no-scroll')
    return () => root.classList.remove('custom-cursor')
  }, [isTouch, reduced])
}