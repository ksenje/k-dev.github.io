import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.ts'
import { parseCookies, SessionService } from '../services/sessions.ts'

export type AdminRequest = Request & {
  adminSessionId?: string
  adminCsrf?: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Attaches the session when a valid cookie is present. Never rejects. */
export function loadSession(req: Request, _res: Response, next: NextFunction): void {
  const typed = req as AdminRequest
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[config.sessionCookieName]
  const resolved = SessionService.resolve(token)
  if (resolved) {
    typed.adminSessionId = resolved.session.id
    typed.adminCsrf = resolved.csrf
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const typed = req as AdminRequest
  if (!typed.adminSessionId) {
    res.status(401).json({ error: 'Требуется авторизация' })
    return
  }
  next()
}

/** Double submit token for every state changing admin request. */
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const typed = req as AdminRequest
  const header = req.headers['x-csrf-token']
  const origin = req.headers.origin

  if (origin) {
    const host = req.headers.host
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {
      res.status(403).json({ error: 'Некорректный Origin' })
      return
    }
    if (originHost !== host) {
      res.status(403).json({ error: 'Cross origin request blocked' })
      return
    }
  }

  if (typeof header !== 'string' || header.length === 0 || header !== typed.adminCsrf) {
    res.status(403).json({ error: 'CSRF token mismatch' })
    return
  }

  next()
}