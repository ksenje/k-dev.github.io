import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'
import { springSlower } from '../../lib/motion'

type GlassPanelProps = {
  children: ReactNode
  className?: string
  variant?: 'default' | 'soft' | 'strong' | 'deep'
  /** Max tilt in degrees. Keep small. */
  tilt?: number
  /** Lift the panel on hover. */
  lift?: boolean
  /** Cursor driven specular light inside the material. */
  light?: boolean
  /** Extra refraction band on the rim. */
  edge?: boolean
  /** Animate on scroll into view. */
  reveal?: boolean
  delay?: number
  as?: 'div' | 'section' | 'article' | 'li'
  role?: string
  ariaLabel?: string
}

const VARIANTS: Record<NonNullable<GlassPanelProps['variant']>, string> = {
  default: '',
  soft: 'glass-soft',
  strong: 'glass-strong',
  deep: 'glass-deep',
}

/**
 * Core liquid glass surface: layered transmission, gradient rim, inner
 * reflections, cursor light and optional micro tilt. Pointer work is throttled
 * to one frame and skipped entirely on touch devices.
 */
export function GlassPanel({
  children,
  className = '',
  variant = 'default',
  tilt = 0,
  lift = true,
  light = true,
  edge = false,
  reveal = false,
  delay = 0,
  as = 'div',
  role,
  ariaLabel,
}: GlassPanelProps) {
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()
  const canTilt = !isTouch && !reduced && tilt > 0
  const frame = useRef(0)
  const latest = useRef<{ x: number; y: number } | null>(null)

  const rawRotateX = useMotionValue(0)
  const rawRotateY = useMotionValue(0)
  const rotateX = useSpring(rawRotateX, springSlower)
  const rotateY = useSpring(rawRotateY, springSlower)

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    // Touch pointers fire this while scrolling: nothing to compute there.
    if (isTouch) return

    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    latest.current = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }

    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const point = latest.current
      if (!point) return
      node.style.setProperty('--light-x', `${point.x.toFixed(2)}%`)
      node.style.setProperty('--light-y', `${point.y.toFixed(2)}%`)
      if (!canTilt) return
      rawRotateY.set(((point.x - 50) / 50) * tilt)
      rawRotateX.set(((50 - point.y) / 50) * tilt)
    })
  }

  const resetTilt = () => {
    rawRotateX.set(0)
    rawRotateY.set(0)
  }

  const Tag = motion[as]

  const classes = [
    'glass',
    VARIANTS[variant],
    light ? 'glass-light' : '',
    edge ? 'glass-edge' : '',
    lift && !isTouch ? 'glass-hover' : '',
    'rounded-[26px]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      className={classes}
      role={role}
      aria-label={ariaLabel}
      style={{
        transformPerspective: 1200,
        transformStyle: canTilt ? 'preserve-3d' : undefined,
        rotateX: canTilt ? rotateX : 0,
        rotateY: canTilt ? rotateY : 0,
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={canTilt ? resetTilt : undefined}
      initial={
        reveal
          ? { opacity: 0, y: reduced || isTouch ? 0 : 30, filter: reduced || isTouch ? 'none' : 'blur(14px)' }
          : false
      }
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true }}
      transition={{ duration: isTouch ? 0.5 : 0.95, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={lift && !reduced && !isTouch ? { y: -4 } : undefined}
    >
      <div className="glass-inner relative">{children}</div>
    </Tag>
  )
}