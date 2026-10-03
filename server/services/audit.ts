import { db } from '../db.ts'
import { config, log } from '../config.ts'

export type AuditEntry = {
  id: number
  action: string
  actor: string
  actor_ip: string | null
  metadata: string | null
  created_at: string
}

export type Actor = 'admin' | 'telegram' | 'system' | 'public'

/** Every privileged or suspicious action is written here. */
export const AuditService = {
  record(action: string, actor: Actor, ip?: string | null, metadata?: Record<string, unknown>): void {
    try {
      db.prepare('INSERT INTO admin_logs (action, actor, actor_ip, metadata) VALUES (?, ?, ?, ?)').run(
        action,
        actor,
        ip ?? null,
        metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
      )
    } catch (error) {
      log('error', 'failed to write audit entry', { action, error: (error as Error).message })
    }
  },

  list(limit = 100, offset = 0): { entries: AuditEntry[]; total: number } {
    const safeLimit = Math.min(Math.max(limit, 1), 500)
    const safeOffset = Math.max(offset, 0)
    const entries = db
      .prepare('SELECT * FROM admin_logs ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(safeLimit, safeOffset) as unknown as AuditEntry[]
    const total = (db.prepare('SELECT COUNT(*) AS count FROM admin_logs').get() as { count: number }).count
    return { entries, total }
  },

  recent(limit = 10): AuditEntry[] {
    return AuditService.list(limit, 0).entries
  },

  /** Repeated failures from one IP inside the window: brute force signal. */
  failedLoginsSince(ip: string, minutes = 15): number {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count FROM login_attempts
         WHERE ip = ? AND ok = 0 AND created_at > datetime('now', ?)`,
      )
      .get(ip, `-${minutes} minutes`) as unknown as { count: number }
    return row.count
  },

  recordLoginAttempt(ip: string, ok: boolean): void {
    db.prepare('INSERT INTO login_attempts (ip, ok) VALUES (?, ?)').run(ip, ok ? 1 : 0)
  },
}

export function clientIp(req: { socket: { remoteAddress?: string }; headers: Record<string, unknown> }): string {
  const forwarded = req.headers['x-forwarded-for']
  // Forwarded headers are attacker controlled unless a proxy is in front of us.
  if (config.trustProxy && typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim().slice(0, 64)
  }
  return (req.socket.remoteAddress ?? 'unknown').slice(0, 64)
}

export function isTrustedProxy(env: string | undefined): boolean {
  return env === 'true'
}

export const auditConfig = { retentionDays: config.auditRetentionDays }