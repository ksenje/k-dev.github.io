import type { NextFunction, Request, Response } from 'express'
import { config, log } from '../config.ts'
import { AuditService, clientIp } from '../services/audit.ts'

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )
  res.setHeader('Origin-Agent-Cluster', '?1')

  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // The dev server serves assets over http from a different origin.
  if (config.isProduction) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "connect-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "object-src 'none'",
        'upgrade-insecure-requests',
      ].join('; '),
    )
  }

  next()
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])

/** Extra origins the local Vite dev server is allowed to talk to. */
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

/** Same origin is always permitted; anything else must be explicitly listed. */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin
  res.setHeader('Vary', 'Origin')

  if (origin) {
    const allowed =
      isSameOrigin(origin, req.headers.host) ||
      config.cors.allowedOrigins.includes(origin) ||
      DEV_ORIGINS.includes(origin)

    if (!allowed) {
      AuditService.record('cors.blocked', 'system', clientIp(req), { origin, path: req.path })
      res.status(403).json({ error: 'Origin not allowed' })
      return
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')
    res.setHeader('Access-Control-Max-Age', '600')
  }

  if (req.method === 'OPTIONS') {
    if (!ALLOWED_METHODS.has(req.method)) {
      res.status(405).end()
      return
    }
    res.status(204).end()
    return
  }

  next()
}

function isSameOrigin(origin: string, host: string | undefined): boolean {
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Rejects oversized bodies before they are parsed. */
export function requestSizeLimit(limit: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const declared = Number(req.headers['content-length'] ?? '0')
    if (Number.isFinite(declared) && declared > limit) {
      AuditService.record('request.too_large', 'system', clientIp(req), {
        path: req.path,
        declared,
        limit,
      })
      res.status(413).json({ error: 'Payload too large' })
      return
    }
    next()
  }
}

/** Fails slow requests instead of letting them pile up. */
export function requestTimeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        log('warn', 'request timeout', { path: req.path, ip: clientIp(req) })
        res.status(503).json({ error: 'Request timeout' })
      }
    }, ms)
    timer.unref?.()
    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))
    next()
  }
}

export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store')
  next()
}