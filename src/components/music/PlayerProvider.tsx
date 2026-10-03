import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { bundledCatalog, catalogIsBundled, loadCatalog, type Track } from '../../lib/catalog'

type PlayerState = {
  tracks: Track[]
  loading: boolean
  error: string | null
  current: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  refresh: () => Promise<void>
  playTrack: (track: Track) => void
  toggle: () => void
  playAt: (index: number) => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
}

const PlayerContext = createContext<PlayerState | null>(null)

const VOLUME_KEY = 'kxz.player.volume'
const DEFAULT_VOLUME = 0.8

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tracksRef = useRef<Track[]>([])
  const currentIdRef = useRef<number | null>(null)

  // The bundled catalogue is read synchronously, so the common case renders the
  // catalogue on the first pass instead of flashing a loading state.
  const initial = useMemo(() => bundledCatalog(), [])
  const [tracks, setTracks] = useState<Track[]>(() => (catalogIsBundled && !initial.disabled ? initial.tracks : []))
  const [loading, setLoading] = useState(!catalogIsBundled)
  const [error, setError] = useState<string | null>(() =>
    catalogIsBundled && initial.disabled ? 'Музыкальный раздел временно недоступен' : null,
  )
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_VOLUME
    const raw = window.localStorage.getItem(VOLUME_KEY)
    if (raw === null) return DEFAULT_VOLUME
    const stored = Number(raw)
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : DEFAULT_VOLUME
  })
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  useEffect(() => {
    currentIdRef.current = currentId
  }, [currentId])

  const updateMediaSession = useCallback((track: Track) => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'ксенже',
      album: 'Музыка',
    })
  }, [])

  // A single audio element for the whole site: nothing is fetched until a track
  // is picked, and only the active file is ever buffered.
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const onTime = () => setCurrentTime(audio.currentTime)
    const onDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      const list = tracksRef.current
      const index = list.findIndex((track) => track.id === currentIdRef.current)
      const nextTrack = index >= 0 && index < list.length - 1 ? list[index + 1] : null
      if (!nextTrack) {
        // Keep the last frame so the waveform and seek bar visibly reach the end.
        setCurrentTime(Number.isFinite(audio.duration) ? audio.duration : 0)
        setIsPlaying(false)
        return
      }
      setCurrentId(nextTrack.id)
      setCurrentTime(0)
      setDuration(nextTrack.duration ?? 0)
      audio.src = nextTrack.audioUrl
      void audio.play().catch(() => setIsPlaying(false))
      updateMediaSession(nextTrack)
    }
    const onError = () => {
      setIsPlaying(false)
      setError('Не удалось воспроизвести трек')
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
    window.localStorage.setItem(VOLUME_KEY, String(volume))
  }, [volume])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const catalog = await loadCatalog()
      setTracks(catalog.disabled ? [] : catalog.tracks)
      setError(catalog.disabled ? 'Музыкальный раздел временно недоступен' : null)
    } catch (cause) {
      setTracks([])
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить треки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (catalogIsBundled) return
    void refresh()
  }, [refresh])

  // The first track is shown (and playable) before any explicit pick, so the
  // player never opens in a disabled, title-less state. No audio is fetched yet.
  const current = useMemo(
    () => tracks.find((track) => track.id === currentId) ?? tracks[0] ?? null,
    [tracks, currentId],
  )

  const playTrack = useCallback(
    (track: Track) => {
      const audio = audioRef.current
      if (!audio) return
      setError(null)

      if (currentId === track.id) {
        if (audio.paused) void audio.play().catch(() => setIsPlaying(false))
        else audio.pause()
        return
      }

      setCurrentId(track.id)
      setCurrentTime(0)
      setDuration(track.duration ?? 0)
      audio.src = track.audioUrl
      void audio.play().catch(() => setIsPlaying(false))
      updateMediaSession(track)
    },
    [currentId, updateMediaSession],
  )

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!current) return
    if (currentId !== current.id) {
      playTrack(current)
      return
    }
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false))
    else audio.pause()
  }, [current, currentId, playTrack])

  const playAt = useCallback((index: number) => {
    const track = tracksRef.current[index]
    if (track) playTrack(track)
  }, [playTrack])

  const step = useCallback((delta: number) => {
    const list = tracksRef.current
    if (!list.length) return
    const index = list.findIndex((track) => track.id === currentIdRef.current)
    const base = index < 0 ? 0 : index
    const nextIndex = (base + delta + list.length) % list.length
    const track = list[nextIndex]
    if (!track) return
    setCurrentId(track.id)
    setCurrentTime(0)
    setDuration(track.duration ?? 0)
    const audio = audioRef.current
    if (audio) {
      audio.src = track.audioUrl
      void audio.play().catch(() => setIsPlaying(false))
    }
    updateMediaSession(track)
  }, [updateMediaSession])

  const next = useCallback(() => step(1), [step])
  const previous = useCallback(() => step(-1), [step])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds))
    setCurrentTime(audio.currentTime)
  }, [])

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value))
    setVolumeState(clamped)
    setMuted(clamped === 0)
    if (audioRef.current) audioRef.current.muted = clamped === 0
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      const next = !value
      if (audioRef.current) audioRef.current.muted = next
      return next
    })
  }, [])

  // Hardware and OS level controls drive the same handlers.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', () => void audioRef.current?.play().catch(() => setIsPlaying(false))],
      ['pause', () => audioRef.current?.pause()],
      ['nexttrack', next],
      ['previoustrack', previous],
    ]
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        /* unsupported action on this browser */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          /* unsupported action on this browser */
        }
      }
    }
  }, [next, previous])

  const value: PlayerState = {
    tracks,
    loading,
    error,
    current,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    refresh,
    playTrack,
    toggle,
    playAt,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerState {
  const context = useContext(PlayerContext)
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider')
  return context
}