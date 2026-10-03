import { db } from '../db.ts'
import { config, randomToken, sha256, log } from '../config.ts'
import { verifyPasswordHash, verifyPlainPassword } from '../security/password.ts'

export type Session = {
  id: string
  user_agent: string
  ip: string
  created_at: string
  last_seen: string
  expires_at: string
}

/** scrypt password verification. Hashes are stored as salt:hash hex pairs. */
export function verifyPassword(password: string): boolean {
  const stored = config.admin.passwordHash
  if (stored) {
    if (!verifyPasswordHash(password, stored)) {
      if (!stored.includes(':')) log('error', 'ADMIN_PASSWORD_HASH is malformed')
      return false
    }
    return true
  }

  // Development fallback: plain password from env, compared in constant time.
  return verifyPlainPassword(password, config.admin.password ?? '')
}

export const SessionService = {
  create(ip: string, userAgent: string): { id: string; token: string; csrf: string } {
    const id = randomToken(9)
    const token = randomToken(32)
    const csrf = randomToken(24)
    db.prepare(
      `INSERT INTO admin_sessions (id, token_hash, user_agent, ip, csrf, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', ?))`,
    ).run(id, sha256(token), userAgent.slice(0, 300), ip, csrf, `+${config.sessionTtlMs / 1000} seconds`)

    db.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at) < datetime('now')").run()
    return { id, token, csrf }
  },

  resolve(token: string | undefined): { session: Session; csrf: string } | null {
    if (!token) return null
    const row = db
      .prepare('SELECT * FROM admin_sessions WHERE token_hash = ? AND datetime(expires_at) > datetime(\'now\')')
      .get(sha256(token)) as unknown as (Session & { token_hash: string; csrf: string }) | undefined
    if (!row) return null

    db.prepare("UPDATE admin_sessions SET last_seen = datetime('now') WHERE id = ?").run(row.id)
    return {
      session: {
        id: row.id,
        user_agent: row.user_agent,
        ip: row.ip,
        created_at: row.created_at,
        last_seen: row.last_seen,
        expires_at: row.expires_at,
      },
      csrf: row.csrf,
    }
  },

  list(): Session[] {
    return db
      .prepare(
        `SELECT id, user_agent, ip, created_at, last_seen, expires_at FROM admin_sessions
         WHERE datetime(expires_at) > datetime('now')
         ORDER BY datetime(last_seen) DESC`,
      )
      .all() as unknown as Session[]
  },

  revoke(id: string): boolean {
    const result = db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(id)
    return Number(result.changes) > 0
  },

  revokeAll(): number {
    const result = db.prepare('DELETE FROM admin_sessions').run()
    return Number(result.changes)
  },
}

export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.secureCookies,
  path: '/',
}

export function serializeCookie(
  name: string,
  value: string,
  options: { httpOnly?: boolean; maxAge?: number } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${COOKIE_BASE.path}`, 'SameSite=Strict']
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  if (COOKIE_BASE.secure) parts.push('Secure')
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`)
  return parts.join('; ')
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const result: Record<string, string> = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }
  return result
}