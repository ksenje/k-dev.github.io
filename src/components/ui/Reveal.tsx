import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useIsTouch, usePrefersReducedMotion } from '../../hooks/useEnvironment'
import { easeSpring } from '../../lib/motion'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  /** Travel distance in pixels. */
  y?: number
  /** Blur reveal on entry. */
  blur?: boolean
  once?: boolean
}

export function Reveal({ children, className = '', delay = 0, y = 28, blur = true, once = true }: RevealProps) {
  const reduced = usePrefersReducedMotion()
  const isTouch = useIsTouch()
  // Blur transitions are repainted every frame: cheap on desktop, costly on phones.
  const useBlur = blur && !reduced && !isTouch

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced || isTouch ? 0 : y, filter: useBlur ? 'blur(14px)' : 'none' }}
      whileInView={{ opacity: 1, y: 0, filter: useBlur ? 'blur(0px)' : 'none' }}
      viewport={{ once }}
      transition={{ duration: isTouch ? 0.5 : 0.9, delay, ease: easeSpring }}
    >
      {children}
    </motion.div>
  )
}

type SectionHeadingProps = {
  eyebrow: string
  title: string
  highlight?: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      <Reveal>
        <div className={`mono-label flex items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
          <span aria-hidden="true" className="inline-block h-px w-8 bg-gradient-to-r from-transparent to-glacier/70" />
          {eyebrow}
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <h2 className="mt-4 text-[clamp(2rem,5.2vw,3.6rem)] leading-[1.03] font-semibold tracking-[-0.03em] text-gradient">
          {title}
          {highlight ? <span className="text-gradient-ice"> {highlight}</span> : null}
        </h2>
      </Reveal>

      {description ? (
        <Reveal delay={0.16}>
          <p className="mt-5 text-[0.98rem] leading-relaxed text-frost-300/90">{description}</p>
        </Reveal>
      ) : null}
    </div>
  )
}