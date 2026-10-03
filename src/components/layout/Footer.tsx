import { motion } from 'framer-motion'
import { identity, navItems } from '../../data/site'
import { useRevealProps } from '../../lib/motion'

export function Footer() {
  const reveal = useRevealProps()

  return (
    <footer className="relative z-20 px-4 pt-8 pb-10 sm:px-6 sm:pb-12">
      <motion.div
        className="glass glass-light mx-auto max-w-6xl rounded-[26px] px-5 py-6 sm:px-7"
        initial={reveal.initial}
        whileInView={reveal.whileInView}
        viewport={reveal.viewport}
        transition={reveal.transition}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[0.95rem] font-medium tracking-tight text-frost-50">{identity.name}</span>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-block py-1.5 text-[0.82rem] text-frost-300/85 transition-colors hover:text-frost-50"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="hairline my-5" />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.72rem] tracking-[0.14em] text-frost-400 uppercase">
            {identity.role}
          </p>
          <p className="font-mono text-[0.72rem] tracking-[0.14em] text-frost-400/90 uppercase">
            {identity.copyright}
          </p>
        </div>
      </motion.div>
    </footer>
  )
}