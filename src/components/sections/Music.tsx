import { motion } from 'framer-motion'
import { usePlayer } from '../music/PlayerProvider'
import { music } from '../../data/site'
import { SectionHeading } from '../ui/Reveal'
import { GlassPanel } from '../ui/GlassPanel'
import { PauseIcon, PlayIcon } from '../ui/Icons'

export function Music() {
  const { tracks, loading, error, current, isPlaying, playTrack } = usePlayer()

  return (
    <section id="music" className="section relative px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow={music.eyebrow}
          title={music.title}
          description="Плеер появляется внизу экрана, когда вы нажмёте «Слушать»."
        />

        <div className="mt-12">
          {loading ? (
            <p className="text-sm text-frost-400">Загрузка каталога…</p>
          ) : error ? (
            <GlassPanel className="p-6">
              <p className="text-sm text-frost-300">{error}</p>
            </GlassPanel>
          ) : tracks.length === 0 ? null : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {tracks.map((track, index) => {
                const active = current?.id === track.id
                return (
                  <motion.li
                    key={track.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                    transition={{ duration: 0.7, delay: Math.min(index * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
                  >
                    <GlassPanel className="p-3" lift={false}>
                      <button
                        type="button"
                        onClick={() => playTrack(track)}
                        className="flex w-full items-center gap-3.5 rounded-[18px] p-1.5 text-left transition-colors duration-300 hover:bg-white/4"
                        aria-label={`${isPlaying && active ? 'Пауза' : 'Слушать'}: ${track.title}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.95rem] font-medium text-frost-50">{track.title}</p>
                        </div>
                        <span className="btn btn-ghost btn-sm shrink-0 !px-3">
                          {active && isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                        </span>
                      </button>
                    </GlassPanel>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
