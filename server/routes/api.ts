import { Router } from 'express'
import { config } from '../config.ts'
import { TrackService, ValidationError } from '../services/tracks.ts'
import { SettingsService } from '../services/settings.ts'
import { AuditService, clientIp } from '../services/audit.ts'
import { SessionService } from '../services/sessions.ts'
import { rateLimit } from '../middleware/rateLimit.ts'
import { noStore } from '../middleware/security.ts'
import { readMultipart, UploadError } from '../upload.ts'
import { humanSize, validateUpload } from '../storage.ts'

export const publicRouter = Router()

/** Express 5 types route params as string | string[]. */
function param(req: { params: Record<string, string | string[] | undefined> }, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function idParam(req: { params: Record<string, string | string[] | undefined> }, name = 'id'): number {
  return Number.parseInt(param(req, name), 10)
}

/** Published tracks only. No internal paths, no admin fields. */
publicRouter.get(
  '/tracks',
  rateLimit({ scope: 'public', limit: config.rateLimits.publicApi }),
  (_req, res) => {
    const settings = SettingsService.all()
    if (settings.music_enabled !== '1') {
      res.setHeader('Cache-Control', 'public, max-age=60')
      res.json({ tracks: [], disabled: true })
      return
    }
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
    res.json({ tracks: TrackService.listPublished() })
  },
)

publicRouter.get(
  '/tracks/:id',
  rateLimit({ scope: 'public', limit: config.rateLimits.publicApi }),
  (req, res) => {
    const id = idParam(req)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'Некорректный идентификатор' })
      return
    }
    const track = TrackService.get(id)
    if (!track) {
      res.status(404).json({ error: 'Трек не найден' })
      return
    }
    res.setHeader('Cache-Control', 'public, max-age=30')
    res.json({ track })
  },
)

publicRouter.get('/site', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60')
  res.json({ settings: SettingsService.all() })
})

export const adminRouter = Router()

adminRouter.use(noStore)

adminRouter.get('/tracks', (_req, res) => {
  res.json({ tracks: TrackService.listAll() })
})

adminRouter.get('/stats', (_req, res) => {
  res.json({ stats: TrackService.stats() })
})

adminRouter.get('/sessions', (_req, res) => {
  res.json({ sessions: SessionService.list() })
})

adminRouter.delete(
  '/sessions/:id',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const target = param(req, 'id')
    const revoked = SessionService.revoke(target)
    AuditService.record(revoked ? 'session.revoked' : 'session.revoke_failed', 'admin', clientIp(req), {
      session: target,
    })
    res.json({ ok: revoked })
  },
)

adminRouter.post(
  '/sessions/revoke-all',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const count = SessionService.revokeAll()
    AuditService.record('sessions.revoked_all', 'admin', clientIp(req), { count })
    res.json({ ok: true, count })
  },
)

adminRouter.get('/logs', (req, res) => {
  const limit = Number.parseInt(String(req.query.limit ?? '100'), 10)
  const offset = Number.parseInt(String(req.query.offset ?? '0'), 10)
  res.json(AuditService.list(Number.isFinite(limit) ? limit : 100, Number.isFinite(offset) ? offset : 0))
})

adminRouter.get('/settings', (_req, res) => {
  res.json({ settings: SettingsService.all() })
})

adminRouter.patch(
  '/settings',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const body = req.body as Record<string, unknown>
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Некорректные параметры' })
      return
    }
    try {
      const settings = SettingsService.update(body as never)
      AuditService.record('settings.updated', 'admin', clientIp(req), { keys: Object.keys(body).slice(0, 20) })
      res.json({ settings })
    } catch (error) {
      res.status(400).json({ error: (error as Error).message })
    }
  },
)

adminRouter.post(
  '/tracks',
  rateLimit({ scope: 'upload', limit: config.rateLimits.upload, bySession: true }),
  async (req, res) => {
    try {
      const { files, fields } = await readMultipart(req, config.limits.maxAudioBytes, 3)

      const audio = files.find((file) => file.field === 'audio')
      const cover = files.find((file) => file.field === 'cover')

      if (!audio) {
        res.status(400).json({ error: 'Аудиофайл обязателен' })
        return
      }

      const audioCheck = validateUpload(audio.buffer, 'audio')
      if (!audioCheck.ok) {
        AuditService.record('upload.rejected', 'admin', clientIp(req), { reason: audioCheck.reason, field: 'audio' })
        res.status(415).json({ error: audioCheck.reason })
        return
      }

      let coverBuffer: Buffer | null = null
      if (cover) {
        const coverCheck = validateUpload(cover.buffer, 'image')
        if (!coverCheck.ok) {
          AuditService.record('upload.rejected', 'admin', clientIp(req), { reason: coverCheck.reason, field: 'cover' })
          res.status(415).json({ error: coverCheck.reason })
          return
        }
        coverBuffer = cover.buffer
      }

      const track = TrackService.create({
        title: fields.title ?? '',
        artist: fields.artist ?? '',
        description: fields.description ?? '',
        audio: audio.buffer,
        cover: coverBuffer,
        published: fields.published === '1' || fields.published === 'true',
        source: 'admin',
      })

      AuditService.record('track.created', 'admin', clientIp(req), {
        id: track.id,
        title: track.title,
        published: track.published,
        size: humanSize(track.audioSize),
      })
      res.status(201).json({ track })
    } catch (error) {
      if (error instanceof UploadError) {
        res.status(413).json({ error: error.message })
        return
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message, field: error.field })
        return
      }
      AuditService.record('track.create_failed', 'admin', clientIp(req), {
        error: (error as Error).message,
      })
      res.status(500).json({ error: 'Не удалось сохранить трек' })
    }
  },
)

adminRouter.patch(
  '/tracks/:id',
  rateLimit({ scope: 'upload', limit: config.rateLimits.upload, bySession: true }),
  async (req, res) => {
    const id = idParam(req)
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'Некорректный идентификатор' })
      return
    }

    try {
      const contentType = req.headers['content-type'] ?? ''
      const isMultipart = contentType.toLowerCase().startsWith('multipart/form-data')

      if (!isMultipart) {
        const body = req.body as Record<string, unknown>
        const track = TrackService.update(id, {
          title: body.title as string | undefined,
          artist: body.artist as string | undefined,
          description: body.description as string | undefined,
          duration: typeof body.duration === 'number' ? body.duration : undefined,
        })
        AuditService.record('track.updated', 'admin', clientIp(req), {
          id,
          fields: Object.keys(body).slice(0, 10),
        })
        res.json({ track })
        return
      }

      const { files, fields } = await readMultipart(req, config.limits.maxCoverBytes, 2)
      const cover = files.find((file) => file.field === 'cover')

      let coverBuffer: Buffer | null = null
      if (cover) {
        const coverCheck = validateUpload(cover.buffer, 'image')
        if (!coverCheck.ok) {
          AuditService.record('upload.rejected', 'admin', clientIp(req), { reason: coverCheck.reason })
          res.status(415).json({ error: coverCheck.reason })
          return
        }
        coverBuffer = cover.buffer
      }

      const track = TrackService.update(id, {
        title: fields.title,
        artist: fields.artist,
        description: fields.description,
        cover: coverBuffer,
      })
      AuditService.record('track.updated', 'admin', clientIp(req), { id, cover: Boolean(coverBuffer) })
      res.json({ track })
    } catch (error) {
      if (error instanceof UploadError) {
        res.status(413).json({ error: error.message })
        return
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message, field: error.field })
        return
      }
      res.status(500).json({ error: 'Не удалось обновить трек' })
    }
  },
)

adminRouter.post(
  '/tracks/:id/publish',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const id = idParam(req)
    try {
      const track = TrackService.setPublished(id, true)
      AuditService.record('track.published', 'admin', clientIp(req), { id })
      res.json({ track })
    } catch (error) {
      res.status(404).json({ error: (error as Error).message })
    }
  },
)

adminRouter.post(
  '/tracks/:id/unpublish',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const id = idParam(req)
    try {
      const track = TrackService.setPublished(id, false)
      AuditService.record('track.unpublished', 'admin', clientIp(req), { id })
      res.json({ track })
    } catch (error) {
      res.status(404).json({ error: (error as Error).message })
    }
  },
)

adminRouter.delete(
  '/tracks/:id',
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  (req, res) => {
    const id = idParam(req)
    const row = Number.isInteger(id) ? TrackService.getAdmin(id) : null
    const removed = row ? TrackService.remove(id) : false
    AuditService.record(removed ? 'track.deleted' : 'track.delete_failed', 'admin', clientIp(req), {
      id,
      title: row?.title,
    })
    if (!removed) {
      res.status(404).json({ error: 'Трек не найден' })
      return
    }
    res.json({ ok: true })
  },
)