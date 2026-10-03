import { useIsTouch, usePrefersReducedMotion } from '../hooks/useEnvironment'

export const easeSpring = [0.16, 1, 0.3, 1] as const
export const easeSoft = [0.22, 1, 0.36, 1] as const

export const revealVariants = {
  hidden: { opacity: 0, y: 26, filter: 'blur(12px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export const staggerParent = (stagger = 0.08, delay = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
})

export const springSoft = { type: 'spring' as const, stiffness: 140, damping: 20, mass: 0.7 }
export const springSlower = { type: 'spring' as const, stiffness: 90, damping: 18, mass: 0.9 }

/** Scroll reveal props that collapse to a plain fade on phones and reduced motion. */
export function useRevealProps(delay = 0, y = 26) {
  const reduced = usePrefersReducedMotion()
  const isTouch = useIsTouch()
  const filter = reduced || isTouch ? 'none' : 'blur(12px)'
  return {
    initial: { opacity: 0, y: reduced || isTouch ? 0 : y, filter },
    whileInView: { opacity: 1, y: 0, filter },
    viewport: { once: true },
    transition: { duration: reduced || isTouch ? 0.4 : 0.9, delay: reduced ? 0 : delay, ease: easeSpring },
  }
}

/** Staggered entrance factory for hero style sequences. */
export function useStepSequence(base = 0.55, gap = 0.11) {
  const reduced = usePrefersReducedMotion()
  const isTouch = useIsTouch()
  return (index: number) => ({
    hidden: { opacity: 0, y: reduced || isTouch ? 0 : 26, filter: reduced || isTouch ? 'none' : 'blur(12px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: reduced || isTouch ? 0.4 : 1,
        delay: reduced ? 0 : base + index * gap,
        ease: easeSpring,
      },
    },
  })
}