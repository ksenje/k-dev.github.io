import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Touch-first devices get cheaper effects. */
export function useIsTouch(): boolean {
  return useMediaQuery('(hover: none), (pointer: coarse)')
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * Rough performance tier used to scale particle counts and blur cost.
 * 0 = weakest, 1 = medium, 2 = full.
 */
export function useDeviceTier(): 0 | 1 | 2 {
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const isTouch = useIsTouch()

  if (isTouch) return 0
  if (cores <= 4 || memory <= 4) return 1
  return 2
}