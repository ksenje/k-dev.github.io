import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { navItems, identity } from '../../data/site'
import { easeSpring, springSoft, useRevealProps } from '../../lib/motion'
import { ArrowIcon, CloseIcon } from '../ui/Icons'
import avatarUrl from '../../assets/avatar.jpg'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string>('')
  const reveal = useRevealProps()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = navItems.map((item) => item.href.slice(1))
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node))
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0.01, 0.2, 0.6] },
    )

    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('no-scroll', open)
    return () => root.classList.remove('no-scroll')
  }, [open])

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-[90] px-3 pt-3 sm:px-5 sm:pt-4"
      initial={reveal.initial}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ ...reveal.transition, delay: 0.35 }}
    >
      <nav
        className={`glass glass-light mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full px-4 py-2.5 transition-all duration-700 sm:px-5 ${
          scrolled ? 'shadow-[0_18px_50px_-30px_rgba(0,0,0,1)]' : ''
        }`}
        style={{
          ['--glass-tint' as string]: scrolled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          ['--glass-blur' as string]: scrolled ? '24px' : '14px',
        }}
      >
        <a
          href="#home"
          className="group flex items-center gap-2.5 px-1 py-1"
          onClick={() => setOpen(false)}
        >
          <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/6">
            <img
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              decoding="async"
              className="h-full w-full rounded-full object-cover"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_55%)]"
              aria-hidden="true"
            />
            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20 ring-inset" aria-hidden="true" />
          </span>
          <span className="text-[0.95rem] font-medium tracking-tight text-frost-50">{identity.name}</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={`relative rounded-full px-3.5 py-2 text-[0.85rem] transition-colors duration-300 ${
                  active === item.href ? 'text-frost-50' : 'text-frost-300/85 hover:text-frost-50'
                }`}
              >
                {item.label}
                {active === item.href ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-full border border-white/10 bg-white/8"
                    transition={springSoft}
                  />
                ) : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#contact" className="btn btn-primary btn-sm hidden sm:inline-flex">
            Связаться
            <ArrowIcon className="h-4 w-4" />
          </a>

          <button
            type="button"
            className="btn btn-ghost h-10 w-10 !p-0 md:hidden"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <span className="flex flex-col gap-[5px]">
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-3.5 bg-current self-end" />
            </span>}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="mx-auto mt-2 max-w-6xl md:hidden"
            initial={{ opacity: 0, y: -12, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(12px)' }}
            transition={{ duration: 0.42, ease: easeSpring }}
          >
            <div className="glass glass-strong glass-light overflow-hidden rounded-[24px] p-2">
              <ul className="flex flex-col">
                {navItems.map((item, index) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 + index * 0.05, ease: easeSpring }}
                  >
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[0.95rem] text-frost-100 transition-colors hover:bg-white/6"
                    >
                      {item.label}
                      <ArrowIcon className="h-4 w-4 text-frost-400" />
                    </a>
                  </motion.li>
                ))}
              </ul>
              <div className="px-1 pt-1 pb-1">
                <a href="#contact" onClick={() => setOpen(false)} className="btn btn-primary w-full">
                  Связаться
                  <ArrowIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  )
}