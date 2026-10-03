import { Router } from 'express'
import { config } from '../config.ts'
import { AuditService, clientIp } from '../services/audit.ts'
import {
  SessionService,
  serializeCookie,
  parseCookies,
  verifyPassword,
  COOKIE_BASE,
} from '../services/sessions.ts'
import { rateLimit } from '../middleware/rateLimit.ts'
import { loadSession } from '../middleware/auth.ts'
import { noStore, requestSizeLimit } from '../middleware/security.ts'

export const authRouter = Router()

authRouter.use(noStore)

function cookieOptions() {
  return {
    httpOnly: COOKIE_BASE.httpOnly,
    sameSite: COOKIE_BASE.sameSite,
    secure: config.secureCookies,
    path: COOKIE_BASE.path,
    maxAge: config.sessionTtlMs,
  }
}

authRouter.post(
  '/login',
  requestSizeLimit(config.limits.maxJsonBytes),
  rateLimit({
    scope: 'login',
    limit: config.rateLimits.login,
    // Lock out an IP for a while once it burns through the window.
    onLimit: (req) => {
      const failures = AuditService.failedLoginsSince(clientIp(req), 15)
      return failures >= 10 ? `too many failed attempts from ${clientIp(req)}` : null
    },
  }),
  (req, res) => {
    const ip = clientIp(req)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''

    if (password.length > 512) {
      AuditService.record('auth.login.invalid_payload', 'public', ip)
      res.status(400).json({ error: 'Некорректный запрос' })
      return
    }

    const ok = password.length > 0 && verifyPassword(password)
    AuditService.recordLoginAttempt(ip, ok)

    if (!ok) {
      AuditService.record('auth.login.failed', 'public', ip, { agent: req.headers['user-agent']?.slice(0, 120) })
      res.status(401).json({ error: 'Неверный пароль' })
      return
    }

    const session = SessionService.create(ip, req.headers['user-agent'] ?? '')
    AuditService.record('auth.login.success', 'admin', ip, { session: session.id })

    res.setHeader('Set-Cookie', [
      serializeCookie(config.sessionCookieName, session.token, { ...cookieOptions() }),
      serializeCookie(config.csrfCookieName, session.csrf, { httpOnly: false, maxAge: config.sessionTtlMs }),
    ])
    res.json({ ok: true, csrf: session.csrf })
  },
)

authRouter.post('/logout', loadSession, (req, res) => {
  const ip = clientIp(req)
  const session = (req as typeof req & { adminSessionId?: string }).adminSessionId
  if (session) {
    SessionService.revoke(session)
    AuditService.record('auth.logout', 'admin', ip, { session })
  }
  res.setHeader('Set-Cookie', [
    serializeCookie(config.sessionCookieName, '', { maxAge: 0 }),
    serializeCookie(config.csrfCookieName, '', { httpOnly: false, maxAge: 0 }),
  ])
  res.json({ ok: true })
})

authRouter.get('/session', loadSession, (req, res) => {
  const cookies = parseCookies(req.headers.cookie)
  const csrf = cookies[config.csrfCookieName] ?? null
  const session = (req as typeof req & { adminSessionId?: string }).adminSessionId ?? null
  res.json({ authenticated: Boolean(session), csrf, session })
})