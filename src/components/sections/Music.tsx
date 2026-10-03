import { useEffect, useRef } from 'react'
import { usePlayer } from '../music/PlayerProvider'
import { formatTime } from '../../lib/format'
import { music } from '../../data/site'
import { SectionHeading } from '../ui/Reveal'
import { GlassPanel } from '../ui/GlassPanel'
import { MuteIcon, NextIcon, PauseIcon, PlayIcon, PreviousIcon, VolumeIcon } from '../ui/Icons'

/** Deterministic bar heights: same silhouette on every render, no audio analysis. */
const BARS = 48
const HEIGHTS = Array.from({ length: BARS }, (_, index) => {
  const wave = Math.abs(Math.sin(index * 0.62) * 0.55 + Math.cos(index * 0.29) * 0.45)
  return 0.18 + wave * 0.82
})

export function Music() {
  const { tracks, loading, error, current, isPlaying, currentTime, duration, volume, muted, toggle, next, previous, seek, setVolume, toggleMute } =
    usePlayer()

  const waveRef = useRef<HTMLDivElement | null>(null)
  const total = duration || current?.duration || 0
  const progress = total > 0 ? Math.min(1, currentTime / total) : 0
  const volumeLevel = muted ? 0 : volume

  // The progress line is a CSS variable, so playback never re-renders the bar list.
  useEffect(() => {
    waveRef.current?.style.setProperty('--progress', progress.toFixed(4))
  }, [progress])

  return (
    <section id="music" className="section relative px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow={music.eyebrow}
          title={music.title}
          align="center"
        />

        <div className="mt-10 sm:mt-12">
          <GlassPanel
            reveal
            variant="strong"
            edge
            className="relative p-5 sm:p-7"
            role="group"
            ariaLabel="Музыкальный плеер"
          >
            <div className="player-stage h-36 sm:h-48">
              <span className="player-stage-glow" aria-hidden="true" />

              {loading ? (
                <div className="grid h-full place-items-center">
                  <p className="text-sm text-frost-400">Загрузка каталога…</p>
                </div>
              ) : error ? (
                <div className="grid h-full place-items-center px-6 text-center">
                  <p className="text-sm text-frost-300">{error}</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="grid h-full place-items-center">
                  <p className="text-sm text-frost-400">{music.emptyTitle}</p>
                </div>
              ) : (
                <div
                  ref={waveRef}
                  className={`wave h-full ${isPlaying ? 'is-playing' : ''}`}
                  aria-hidden="true"
                >
                  <WaveBars />
                  <WaveBars active />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-4 sm:gap-5">
              <div className="min-w-0 flex-1">
                <p
                  aria-live="polite"
                  className="truncate text-[1.02rem] font-medium tracking-tight text-frost-50"
                >
                  {current?.title ?? ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost h-11 w-11 !p-0"
                  onClick={previous}
                  disabled={tracks.length === 0}
                  aria-label={music.previousLabel}
                >
                  <PreviousIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="btn btn-primary h-13 w-13 !p-0"
                  onClick={toggle}
                  disabled={!current}
                  aria-label={isPlaying ? music.pauseLabel : music.playLabel}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost h-11 w-11 !p-0"
                  onClick={next}
                  disabled={tracks.length === 0}
                  aria-label={music.nextLabel}
                >
                  <NextIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono text-[0.7rem] text-frost-400 tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={total || 1}
                step={0.1}
                value={Math.min(currentTime, total || 1)}
                onChange={(event) => seek(Number(event.target.value))}
                className="player-range flex-1"
                style={{
                  background: `linear-gradient(90deg, rgba(255,255,255,0.85) ${progress * 100}%, rgba(255,255,255,0.14) ${progress * 100}%)`,
                }}
                aria-label={music.progressLabel}
                aria-valuetext={`${formatTime(currentTime)} из ${formatTime(total)}`}
              />
              <span className="font-mono text-[0.7rem] text-frost-400 tabular-nums">{formatTime(total)}</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="text-frost-400 transition-colors hover:text-frost-50"
                onClick={toggleMute}
                aria-label={muted || volume === 0 ? music.muteOnLabel : music.muteOffLabel}
                aria-pressed={muted}
              >
                {muted || volume === 0 ? <MuteIcon className="h-4 w-4" /> : <VolumeIcon className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volumeLevel}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="player-range w-24 sm:w-32"
                style={{
                  background: `linear-gradient(90deg, rgba(255,255,255,0.7) ${volumeLevel * 100}%, rgba(255,255,255,0.14) ${volumeLevel * 100}%)`,
                }}
                aria-label={music.volumeLabel}
              />
            </div>
          </GlassPanel>
        </div>
      </div>
    </section>
  )
}

function WaveBars({ active = false }: { active?: boolean }) {
  return (
    <div className={`wave-bars ${active ? 'wave-bars-active' : ''}`}>
      {HEIGHTS.map((height, index) => (
        <span
          key={index}
          className="wave-bar"
          style={{
            height: `${Math.round(height * 100)}%`,
            animationDelay: `${(index % 7) * 0.14}s`,
          }}
        />
      ))}
    </div>
  )
}