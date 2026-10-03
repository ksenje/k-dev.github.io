import { motion } from 'framer-motion'
import { usePlayer } from '../music/PlayerProvider'
import { formatTime } from '../../lib/format'
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
                        <TrackArtwork track={track} active={active} isPlaying={isPlaying} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.95rem] font-medium text-frost-50">{track.title}</p>
                          <p className="truncate text-[0.82rem] text-frost-400">
                            {track.artist} · {formatTime(track.duration)}
                          </p>
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

function TrackArtwork({
  track,
  active,
  isPlaying,
}: {
  track: { id: number; title: string; coverUrl: string | null }
  active: boolean
  isPlaying: boolean
}) {
  if (track.coverUrl) {
    return (
      <img
        src={track.coverUrl}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-[16px] border border-white/10 object-cover"
      />
    )
  }

  return (
    <div
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-[16px] border border-white/10 transition-colors duration-500 ${
        active ? 'bg-white/10 text-frost-50' : 'bg-white/5 text-frost-400'
      }`}
    >
      {active && isPlaying ? (
        <Equalizer />
      ) : (
        <span className="font-mono text-[0.72rem]">{track.id.toString().padStart(2, '0')}</span>
      )}
    </div>
  )
}

function Equalizer() {
  return (
    <span aria-hidden="true" className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2].map((bar) => (
        <motion.span
          key={bar}
          className="w-[3px] rounded-full bg-current"
          animate={{ height: ['30%', '100%', '45%', '85%', '30%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: bar * 0.18 }}
          style={{ height: '40%' }}
        />
      ))}
    </span>
  )
}