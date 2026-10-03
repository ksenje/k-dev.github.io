import type { NextFunction, Request, Response } from 'express'
import { config, log } from '../config.ts'
import { AuditService, clientIp } from '../services/audit.ts'

type Bucket = { count: number; resetAt: number }

/**
 * In-memory fixed window limiter. One process, one instance: this is a
 * single node deployment, so shared storage is not required.
 */
const buckets = new Map<string, Bucket>()

let lastSweep = Date.now()

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function rateLimit(options: {
  scope: string
  limit: number
  windowMs?: number
  /** Key by authenticated session instead of IP. */
  bySession?: boolean
  onLimit?: (req: Request) => string | null
}) {
  const windowMs = options.windowMs ?? config.rateLimits.windowMs

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    sweep(now)

    const identity = options.bySession
      ? ((req as Request & { adminSessionId?: string }).adminSessionId ?? clientIp(req))
      : clientIp(req)

    const key = `${options.scope}:${identity}`
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    bucket.count += 1

    const blocked = options.onLimit ? Boolean(options.onLimit(req)) : bucket.count > options.limit

    if (bucket.count > options.limit || blocked) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      AuditService.record('ratelimit.blocked', 'system', identity, {
        scope: options.scope,
        path: req.path,
        count: bucket.count,
      })
      log('warn', 'rate limit hit', { scope: options.scope, identity, path: req.path })
      res.setHeader('Retry-After', String(retryAfter))
      res.status(429).json({ error: 'Too many requests', retryAfter })
      return
    }

    res.setHeader('X-RateLimit-Limit', String(options.limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(options.limit - bucket.count, 0)))
    next()
  }
}

export function rateLimitState(): { scopes: number; entries: number } {
  return { scopes: new Set([...buckets.keys()].map((key) => key.split(':')[0])).size, entries: buckets.size }
}

export function resetRateLimits(): void {
  buckets.clear()
}