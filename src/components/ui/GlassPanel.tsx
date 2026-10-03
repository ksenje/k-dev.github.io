import type { PointerEvent, ReactNode } from 'react'
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
}

const VARIANTS: Record<NonNullable<GlassPanelProps['variant']>, string> = {
  default: '',
  soft: 'glass-soft',
  strong: 'glass-strong',
  deep: 'glass-deep',
}

/**
 * Core liquid glass surface: layered transmission, gradient rim, inner
 * reflections, cursor light and optional micro tilt.
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
}: GlassPanelProps) {
  const isTouch = useIsTouch()
  const reduced = usePrefersReducedMotion()
  const canTilt = !isTouch && !reduced && tilt > 0

  const rawRotateX = useMotionValue(0)
  const rawRotateY = useMotionValue(0)
  const rotateX = useSpring(rawRotateX, springSlower)
  const rotateY = useSpring(rawRotateY, springSlower)

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * 100
    const py = ((event.clientY - rect.top) / rect.height) * 100

    node.style.setProperty('--light-x', `${px.toFixed(2)}%`)
    node.style.setProperty('--light-y', `${py.toFixed(2)}%`)

    if (!canTilt) return
    rawRotateY.set(((px - 50) / 50) * tilt)
    rawRotateX.set(((50 - py) / 50) * tilt)
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
    lift ? 'glass-hover' : '',
    'rounded-[26px]',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      className={classes}
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
          ? { opacity: 0, y: reduced ? 0 : 30, filter: reduced ? 'none' : 'blur(14px)' }
          : false
      }
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.95, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={lift && !reduced ? { y: -4 } : undefined}
    >
      <div className="glass-inner relative">{children}</div>
    </Tag>
  )
}