import { AnimatePresence, motion } from 'framer-motion'
import { usePlayer } from './PlayerProvider'
import { formatTime } from '../../lib/format'
import { easeSpring } from '../../lib/motion'
import { MuteIcon, NextIcon, PauseIcon, PlayIcon, PreviousIcon, VolumeIcon } from '../ui/Icons'

/** Fixed bottom bar. One audio element lives in PlayerProvider, not here. */
export function MusicPlayer() {
  const { current, isPlaying, currentTime, duration, volume, muted, toggle, next, previous, seek, setVolume, toggleMute } =
    usePlayer()

  const total = duration || current?.duration || 0
  const progress = total > 0 ? Math.min(100, (currentTime / total) * 100) : 0

  return (
    <AnimatePresence>
      {current ? (
        <motion.aside
          key="player"
          aria-label="Плеер"
          className="fixed inset-x-0 bottom-0 z-[80] px-2 pb-2 sm:px-4 sm:pb-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.45, ease: easeSpring }}
        >
          <div className="glass glass-strong mx-auto flex max-w-5xl flex-col gap-2 rounded-[22px] px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.92rem] font-medium text-frost-50">{current.title}</p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  className="btn btn-ghost h-9 w-9 !p-0"
                  onClick={previous}
                  aria-label="Предыдущий трек"
                >
                  <PreviousIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="btn btn-primary h-11 w-11 !p-0"
                  onClick={toggle}
                  aria-label={isPlaying ? 'Пауза' : 'Играть'}
                >
                  {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>

                <button type="button" className="btn btn-ghost h-9 w-9 !p-0" onClick={next} aria-label="Следующий трек">
                  <NextIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  className="text-frost-400 transition-colors hover:text-frost-50"
                  onClick={toggleMute}
                  aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                >
                  {muted || volume === 0 ? <MuteIcon className="h-4.5 w-4.5" /> : <VolumeIcon className="h-4.5 w-4.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="player-range w-24"
                  aria-label="Громкость"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.68rem] text-frost-400 tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={total || 1}
                step={0.1}
                value={Math.min(currentTime, total || 1)}
                onChange={(event) => seek(Number(event.target.value))}
                className="player-range flex-1"
                style={{
                  background: `linear-gradient(90deg, rgba(255,255,255,0.85) ${progress}%, rgba(255,255,255,0.14) ${progress}%)`,
                }}
                aria-label="Позиция воспроизведения"
              />
              <span className="font-mono text-[0.68rem] text-frost-400 tabular-nums">{formatTime(total)}</span>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
