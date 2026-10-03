import { db } from '../db.ts'
import { config } from '../config.ts'
import { deleteUpload, saveUpload, fileSize } from '../storage.ts'
import { estimateDuration } from '../audio.ts'

export type TrackRow = {
  id: number
  title: string
  artist: string
  description: string
  audio_path: string
  audio_mime: string
  audio_size: number
  cover_path: string | null
  cover_mime: string | null
  cover_size: number | null
  duration: number | null
  published: number
  source: string
  plays: number
  created_at: string
  updated_at: string
}

/** Public representation. Internal storage paths never leave the server. */
export type PublicTrack = {
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

export type AdminTrack = PublicTrack & {
  source: string
  audioSize: number
  coverSize: number | null
  audioMime: string
}

export class ValidationError extends Error {
  field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.field = field
  }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

export function cleanText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`Поле ${field} обязательно`, field)
  const trimmed = value.replace(CONTROL_CHARS, '').trim()
  if (trimmed.length > max) throw new ValidationError(`Поле ${field} длиннее ${max} символов`, field)
  return trimmed
}

export function optionalText(value: unknown, max: number, field: string): string {
  if (value === undefined || value === null) return ''
  return cleanText(value, max, field)
}

function toPublic(row: TrackRow): PublicTrack {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    description: row.description,
    duration: row.duration,
    plays: row.plays,
    published: row.published === 1,
    publishedAt: row.created_at,
    updatedAt: row.updated_at,
    audioUrl: `/media/tracks/${row.id}/audio`,
    coverUrl: row.cover_path ? `/media/tracks/${row.id}/cover` : null,
    hasCover: Boolean(row.cover_path),
  }
}

function toAdmin(row: TrackRow): AdminTrack {
  return {
    ...toPublic(row),
    source: row.source,
    audioSize: row.audio_size,
    coverSize: row.cover_size,
    audioMime: row.audio_mime,
  }
}

const SELECT_ALL = 'SELECT * FROM tracks'

export const TrackService = {
  listPublished(): PublicTrack[] {
    const rows = db
      .prepare(`${SELECT_ALL} WHERE published = 1 ORDER BY datetime(created_at) DESC, id DESC`)
      .all() as unknown as TrackRow[]
    return rows.map(toPublic)
  },

  listAll(): AdminTrack[] {
    const rows = db
      .prepare(`${SELECT_ALL} ORDER BY datetime(created_at) DESC, id DESC`)
      .all() as unknown as TrackRow[]
    return rows.map(toAdmin)
  },

  getRow(id: number): TrackRow | null {
    const row = db.prepare(`${SELECT_ALL} WHERE id = ?`).get(id) as unknown as TrackRow | undefined
    return row ?? null
  },

  get(id: number): PublicTrack | null {
    const row = TrackService.getRow(id)
    if (!row || row.published !== 1) return null
    return toPublic(row)
  },

  getAdmin(id: number): AdminTrack | null {
    const row = TrackService.getRow(id)
    return row ? toAdmin(row) : null
  },

  findByTitleArtist(title: string, artist: string): TrackRow | null {
    const row = db
      .prepare('SELECT * FROM tracks WHERE title = ? AND artist = ? LIMIT 1')
      .get(title, artist) as unknown as TrackRow | undefined
    return row ?? null
  },

  create(input: {
    title: string
    artist: string
    description?: string
    audio: Buffer
    cover?: Buffer | null
    published?: boolean
    source?: string
    duration?: number | null
  }): AdminTrack {
    const title = cleanText(input.title, config.limits.maxTitleLength, 'title')
    const artist = cleanText(input.artist, config.limits.maxArtistLength, 'artist')
    const description = optionalText(input.description, config.limits.maxDescriptionLength, 'description')
    if (!title) throw new ValidationError('Название не может быть пустым', 'title')
    if (!artist) throw new ValidationError('Исполнитель не может быть пустым', 'artist')

    const audio = saveUpload(input.audio, 'audio')
    const duration = input.duration ?? estimateDuration(input.audio, audio.mime)

    let cover: { relative: string; mime: string; size: number } | null = null
    if (input.cover) cover = saveUpload(input.cover, 'image')

    try {
      const result = db
        .prepare(
          `INSERT INTO tracks (title, artist, description, audio_path, audio_mime, audio_size,
                               cover_path, cover_mime, cover_size, duration, published, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          title,
          artist,
          description,
          audio.relative,
          audio.mime,
          audio.size,
          cover?.relative ?? null,
          cover?.mime ?? null,
          cover?.size ?? null,
          duration,
          input.published ? 1 : 0,
          input.source ?? 'admin',
        )

      const id = Number(result.lastInsertRowid)
      return TrackService.getAdmin(id)!
    } catch (error) {
      deleteUpload(audio.relative)
      if (cover) deleteUpload(cover.relative)
      throw error
    }
  },

  update(
    id: number,
    patch: {
      title?: string
      artist?: string
      description?: string
      duration?: number | null
      cover?: Buffer | null
      audio?: Buffer | null
    },
  ): AdminTrack {
    const current = TrackService.getRow(id)
    if (!current) throw new ValidationError('Трек не найден')

    const title = patch.title === undefined ? current.title : cleanText(patch.title, config.limits.maxTitleLength, 'title')
    const artist = patch.artist === undefined ? current.artist : cleanText(patch.artist, config.limits.maxArtistLength, 'artist')
    const description =
      patch.description === undefined
        ? current.description
        : optionalText(patch.description, config.limits.maxDescriptionLength, 'description')

    let audioPath = current.audio_path
    let audioMime = current.audio_mime
    let audioSize = current.audio_size
    let duration = patch.duration === undefined ? current.duration : patch.duration

    let coverPath = current.cover_path
    let coverMime = current.cover_mime
    let coverSize = current.cover_size

    let audio: { relative: string; mime: string; size: number } | null = null

    if (patch.audio) {
      audio = saveUpload(patch.audio, 'audio')
      duration = patch.duration ?? estimateDuration(patch.audio, audio.mime)
    }

    if (patch.cover) {
      const cover = saveUpload(patch.cover, 'image')
      deleteUpload(current.cover_path)
      coverPath = cover.relative
      coverMime = cover.mime
      coverSize = cover.size
    }

    if (audio) {
      deleteUpload(current.audio_path)
      audioPath = audio.relative
      audioMime = audio.mime
      audioSize = audio.size
    }

    db.prepare(
      `UPDATE tracks SET title = ?, artist = ?, description = ?, duration = ?,
                         audio_path = ?, audio_mime = ?, audio_size = ?,
                         cover_path = ?, cover_mime = ?, cover_size = ?,
                         updated_at = datetime('now')
       WHERE id = ?`,
    ).run(
      title,
      artist,
      description,
      duration,
      audioPath,
      audioMime,
      audioSize,
      coverPath,
      coverMime,
      coverSize,
      id,
    )

    return TrackService.getAdmin(id)!
  },

  setPublished(id: number, published: boolean): AdminTrack {
    db.prepare(
      `UPDATE tracks SET published = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(published ? 1 : 0, id)
    const track = TrackService.getAdmin(id)
    if (!track) throw new ValidationError('Трек не найден')
    return track
  },

  remove(id: number): boolean {
    const row = TrackService.getRow(id)
    if (!row) return false
    deleteUpload(row.audio_path)
    deleteUpload(row.cover_path)
    db.prepare('DELETE FROM tracks WHERE id = ?').run(id)
    return true
  },

  incrementPlays(id: number): void {
    db.prepare('UPDATE tracks SET plays = plays + 1 WHERE id = ?').run(id)
  },

  storedAudioSize(id: number): number {
    const row = TrackService.getRow(id)
    return row ? fileSize(row.audio_path) : 0
  },

  stats() {
    const totals = db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END) AS published,
                SUM(CASE WHEN published = 0 THEN 1 ELSE 0 END) AS drafts,
                COALESCE(SUM(plays), 0) AS plays,
                COALESCE(SUM(audio_size), 0) AS bytes
         FROM tracks`,
      )
      .get() as unknown as { total: number; published: number | null; drafts: number | null; plays: number; bytes: number }

    const sources = db
      .prepare('SELECT source, COUNT(*) AS count FROM tracks GROUP BY source')
      .all() as unknown as { source: string; count: number }[]

    const newest = db
      .prepare(
        `SELECT id, title, artist, published, datetime(created_at) AS created_at
         FROM tracks ORDER BY datetime(created_at) DESC, id DESC LIMIT 5`,
      )
      .all() as unknown as {
      id: number
      title: string
      artist: string
      published: number
      created_at: string
    }[]

    return {
      total: totals.total ?? 0,
      published: totals.published ?? 0,
      drafts: totals.drafts ?? 0,
      plays: totals.plays ?? 0,
      bytes: totals.bytes ?? 0,
      bySource: sources,
      newest,
    }
  },
}

export type TrackStats = ReturnType<typeof TrackService.stats>