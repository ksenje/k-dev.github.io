import fs from 'node:fs'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { config, log } from '../config.ts'
import { TrackService } from '../services/tracks.ts'
import { resolveInside } from '../storage.ts'
import { rateLimit } from '../middleware/rateLimit.ts'
import { AuditService, clientIp } from '../services/audit.ts'

export const mediaRouter = Router()

/** Express 5 types route params as string | string[]. */
function idParam(req: { params: Record<string, string | string[] | undefined> }): number {
  const value = req.params['id']
  return Number.parseInt(Array.isArray(value) ? (value[0] ?? '') : (value ?? ''), 10)
}

type Range = { start: number; end: number }

function parseRange(header: string | undefined, size: number): Range | null | 'invalid' {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return 'invalid'

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return 'invalid'

  let start: number
  let end: number

  if (rawStart === '') {
    const suffix = Number.parseInt(rawEnd ?? '0', 10)
    if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid'
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number.parseInt(rawStart ?? '0', 10)
    end = rawEnd === '' ? size - 1 : Number.parseInt(rawEnd ?? '0', 10)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return 'invalid'
  return { start, end: Math.min(end, size - 1) }
}

/** Media is served by track id only: stored filenames never leave the server. */
mediaRouter.get(
  '/tracks/:id/audio',
  rateLimit({ scope: 'media', limit: config.rateLimits.media }),
  (req: Request, res: Response) => {
    const id = idParam(req)
    const row = Number.isInteger(id) ? TrackService.getRow(id) : null

    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    if (row.published !== 1) {
      AuditService.record('media.draft_requested', 'public', clientIp(req), { id })
      res.status(404).json({ error: 'Not found' })
      return
    }

    let absolute: string
    try {
      absolute = resolveInside(row.audio_path)
    } catch {
      res.status(404).json({ error: 'Not found' })
      return
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(absolute)
    } catch {
      AuditService.record('media.missing_file', 'system', clientIp(req), { id })
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.setHeader('Content-Type', row.audio_mime)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    const range = parseRange(req.headers.range, stat.size)
    if (range === 'invalid') {
      res.status(416).setHeader('Content-Range', `bytes */${stat.size}`)
      res.end()
      return
    }

    if (range) {
      res.status(206)
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`)
      res.setHeader('Content-Length', String(range.end - range.start + 1))
      TrackService.incrementPlays(id)
      fs.createReadStream(absolute, { start: range.start, end: range.end }).pipe(res)
      return
    }

    res.setHeader('Content-Length', String(stat.size))
    TrackService.incrementPlays(id)
    fs.createReadStream(absolute).pipe(res)
  },
)

mediaRouter.get(
  '/tracks/:id/cover',
  rateLimit({ scope: 'media', limit: config.rateLimits.media }),
  (req: Request, res: Response) => {
    const id = idParam(req)
    const row = Number.isInteger(id) ? TrackService.getRow(id) : null

    if (!row?.cover_path) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    let absolute: string
    try {
      absolute = resolveInside(row.cover_path)
    } catch {
      res.status(404).json({ error: 'Not found' })
      return
    }

    if (!fs.existsSync(absolute)) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.setHeader('Content-Type', row.cover_mime ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    fs.createReadStream(absolute).pipe(res)
  },
)

mediaRouter.use((req, res) => {
  log('warn', 'unknown media path', { path: req.path, ip: clientIp(req) })
  res.status(404).json({ error: 'Not found' })
})