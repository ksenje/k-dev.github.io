import bundled from '../data/catalog.json'

export type Track = {
  id: number
  title: string
  artist: string
  description: string
  duration: number | null
  plays: number
  published: boolean
  publishedAt: string
  updatedAt: string
  audioUrl: string
  coverUrl: string | null
  hasCover: boolean
}

export type Catalog = {
  tracks: Track[]
  disabled?: boolean
}

/**
 * The deployed site is a static bundle on GitHub Pages, so the catalogue ships with
 * the repository instead of coming from a server. Point VITE_CATALOG_URL at a JSON
 * endpoint to serve the catalogue remotely without touching the code.
 */
const REMOTE_CATALOG = import.meta.env.VITE_CATALOG_URL as string | undefined

function toTrack(entry: Record<string, unknown>, index: number) {
  const audio = String(entry.audio ?? '')
  const cover = entry.cover ? String(entry.cover) : null
  return {
    id: Number(entry.id ?? index + 1),
    title: String(entry.title ?? 'Без названия'),
    artist: String(entry.artist ?? ''),
    description: String(entry.description ?? ''),
    duration: typeof entry.duration === 'number' ? entry.duration : null,
    plays: Number(entry.plays ?? 0),
    published: entry.published !== false,
    publishedAt: String(entry.publishedAt ?? ''),
    updatedAt: String(entry.updatedAt ?? entry.publishedAt ?? ''),
    audioUrl: audio,
    coverUrl: cover,
    hasCover: Boolean(cover),
  }
}

function fromBundle(): Catalog {
  const data = bundled as { tracks?: Record<string, unknown>[]; disabled?: boolean }
  return {
    tracks: (data.tracks ?? []).filter(isPublished).map(toTrack),
    disabled: data.disabled,
  }
}

/** `published: false` keeps the entry in the repository but hides it from the catalogue. */
function isPublished(entry: Record<string, unknown>): boolean {
  return entry.published !== false
}

/** True when the catalogue ships inside the bundle and needs no request. */
export const catalogIsBundled = !REMOTE_CATALOG

/** Synchronous access to the catalogue committed to the repository. */
export function bundledCatalog(): Catalog {
  return fromBundle()
}

/** Loads the catalogue: bundled JSON by default, a remote endpoint when configured. */
export async function loadCatalog(): Promise<Catalog> {
  if (!REMOTE_CATALOG) return fromBundle()

  try {
    const response = await fetch(REMOTE_CATALOG, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as { tracks?: Record<string, unknown>[]; disabled?: boolean }
    return {
      tracks: (data.tracks ?? []).filter(isPublished).map(toTrack),
      disabled: data.disabled,
    }
  } catch {
    // A broken remote endpoint must never blank the bundled catalogue.
    return fromBundle()
  }
}