import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { contacts, identity } from '../../data/site'
import { useStepSequence } from '../../lib/motion'
import { GlassButton } from '../ui/GlassButton'
import { TelegramIcon } from '../ui/Icons'
import avatarUrl from '../../assets/avatar.jpg'

export function Hero() {
  const step = useStepSequence()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 60)
    return () => window.clearTimeout(id)
  }, [])

  const name = identity.name
  const role = identity.role
  const headline = identity.headline
  const telegramUrl = contacts.telegram.url

  return (
    <section id="home" className="section relative flex min-h-[100svh] items-center px-4 pt-28 pb-20 sm:px-6 sm:pt-32">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <motion.p
            className="mono-label"
            initial={step(0).hidden}
            animate={step(0).visible}
            variants={step(0)}
          >
            {loaded ? role : ''}
          </motion.p>

          <motion.h1
            className="mt-5 text-[clamp(2.8rem,9vw,6.4rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-gradient"
            initial={step(1).hidden}
            animate={step(1).visible}
            variants={step(1)}
          >
            {name}
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-[clamp(1rem,2.4vw,1.3rem)] leading-relaxed text-frost-200"
            initial={step(2).hidden}
            animate={step(2).visible}
            variants={step(2)}
          >
            {headline}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={step(3).hidden}
            animate={step(3).visible}
            variants={step(3)}
          >
            <GlassButton href={telegramUrl} external variant="primary">
              <TelegramIcon className="h-4 w-4" />
              Написать в Telegram
            </GlassButton>

            <GlassButton href="#contact">Контакты</GlassButton>
          </motion.div>

          <motion.div
            className="mt-10 flex items-center gap-3 text-frost-400"
            initial={step(4).hidden}
            animate={step(4).visible}
            variants={step(4)}
          >
            <span className="glow-dot h-1.5 w-1.5 rounded-full bg-frost-200" />
            <span className="font-mono text-[0.7rem] tracking-[0.18em] uppercase">На связи</span>
          </motion.div>
        </div>

        <motion.div
          className="order-first lg:order-none"
          initial={step(1).hidden}
          animate={step(1).visible}
          variants={step(1)}
        >
          <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-[17rem] lg:max-w-none">
            {/* contained frame: the glow never leaves the avatar block */}
            <div className="glass glass-light relative overflow-hidden rounded-full p-1.5">
              <div
                className="absolute inset-0 -z-10 rounded-full"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(circle at 50% 35%, rgba(236,238,242,0.14), rgba(182,176,196,0.08) 55%, transparent 72%)',
                }}
              />
              <img
                src={avatarUrl}
                alt={`${name} — ${role}`}
                width={640}
                height={640}
                fetchPriority="high"
                decoding="async"
                className="aspect-square w-full rounded-full object-cover"
              />
            </div>
            <div className="hairline mx-auto mt-6 w-24" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}