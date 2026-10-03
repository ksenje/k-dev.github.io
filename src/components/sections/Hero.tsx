import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { contacts, identity } from '../../data/site'
import { useStepSequence } from '../../lib/motion'
import { GlassButton } from '../ui/GlassButton'
import { usePlayer } from '../music/PlayerProvider'
import { PlayIcon, TelegramIcon } from '../ui/Icons'

export function Hero() {
  const step = useStepSequence()
  const { tracks, playTrack } = usePlayer()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 60)
    return () => window.clearTimeout(id)
  }, [])

  const name = identity.name
  const role = identity.role
  const headline = identity.headline
  const telegramUrl = contacts.telegram.url
  const firstTrack = tracks[0]

  return (
    <section id="home" className="section relative flex min-h-[100svh] items-center px-4 pt-32 pb-20 sm:px-6 sm:pt-36">
      <div className="mx-auto w-full max-w-6xl">
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
          <GlassButton href="#music" variant="primary">
            <PlayIcon className="h-4 w-4" />
            {firstTrack ? 'Слушать музыку' : 'Музыка'}
          </GlassButton>

          <GlassButton href={telegramUrl} external>
            <TelegramIcon className="h-4 w-4" />
            Написать в Telegram
          </GlassButton>

          {firstTrack ? (
            <button type="button" className="text-[0.86rem] text-frost-400 transition-colors hover:text-frost-100" onClick={() => playTrack(firstTrack)}>
              {firstTrack.title}
            </button>
          ) : null}
        </motion.div>

        <motion.div
          className="mt-14 flex items-center gap-3 text-frost-400"
          initial={step(4).hidden}
          animate={step(4).visible}
          variants={step(4)}
        >
          <span className="glow-dot h-1.5 w-1.5 rounded-full bg-frost-200" />
          <span className="font-mono text-[0.7rem] tracking-[0.18em] uppercase">
            {firstTrack ? `${tracks.length} треков в каталоге` : 'Каталог музыки пуст'}
          </span>
        </motion.div>
      </div>
    </section>
  )
}