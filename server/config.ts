import path from 'node:path'
import crypto from 'node:crypto'

type Env = Record<string, string | undefined>

const env: Env = process.env

function int(name: string, fallback: number): number {
  const raw = env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function bool(name: string, fallback: boolean): boolean {
  const raw = env[name]
  if (raw === undefined) return fallback
  return raw === '1' || raw.toLowerCase() === 'true'
}

function list(name: string, fallback: string[]): string[] {
  const raw = env[name]
  if (!raw) return fallback
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const nodeEnv = env.NODE_ENV ?? 'development'
const isProduction = nodeEnv === 'production'
const rootDir = path.resolve(import.meta.dirname, '..')

function parseAdminCredentials(): { hash: string | null; password: string | null } {
  const hash = env.ADMIN_PASSWORD_HASH?.trim() || null
  const password = env.ADMIN_PASSWORD?.trim() || null
  if (!hash && !password) {
    throw new Error('Missing ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD for development)')
  }
  return { hash, password }
}

const credentials = parseAdminCredentials()

export const config = {
  nodeEnv,
  isProduction,
  rootDir,
  port: int('PORT', 4000),
  host: env.HOST ?? '127.0.0.1',

  /** Where uploaded audio and covers live. Never inside the frontend bundle. */
  storageDir: path.resolve(env.STORAGE_DIR ?? path.join(rootDir, 'storage')),
  databaseFile: path.resolve(env.DATABASE_FILE ?? path.join(rootDir, 'storage', 'app.db')),
  frontendDist: path.resolve(env.FRONTEND_DIST ?? path.join(rootDir, 'dist')),

  sessionCookieName: 'sid',
  csrfCookieName: 'csrf',
  sessionTtlMs: int('SESSION_TTL_HOURS', 12) * 60 * 60 * 1000,
  secureCookies: bool('SECURE_COOKIES', isProduction),
  /** Only enable behind a reverse proxy that sets X-Forwarded-For itself. */
  trustProxy: bool('TRUST_PROXY', false),

  admin: {
    id: env.ADMIN_ID?.trim() ?? null,
    passwordHash: credentials.hash,
    password: credentials.password,
  },

  telegram: {
    token: env.TELEGRAM_BOT_TOKEN?.trim() ?? null,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? null,
    adminId: env.TELEGRAM_ADMIN_ID?.trim() ?? null,
    /** Public https endpoint the bot should be bound to, e.g. https://site.dev/api/telegram/webhook */
    webhookUrl: env.TELEGRAM_WEBHOOK_URL?.trim() ?? null,
    apiBase: env.TELEGRAM_API_BASE?.trim() || 'https://api.telegram.org',
  },

  limits: {
    maxAudioBytes: int('MAX_AUDIO_BYTES', 25 * 1024 * 1024),
    maxCoverBytes: int('MAX_COVER_BYTES', 4 * 1024 * 1024),
    maxJsonBytes: int('MAX_JSON_BYTES', 256 * 1024),
    requestTimeoutMs: int('REQUEST_TIMEOUT_MS', 30_000),
    maxTitleLength: 120,
    maxArtistLength: 120,
    maxDescriptionLength: 2000,
  },

  cors: {
    /** Same origin is always allowed; extras must be listed explicitly. */
    allowedOrigins: list('CORS_ORIGINS', []),
  },

  rateLimits: {
    windowMs: int('RATE_LIMIT_WINDOW_MS', 60_000),
    publicApi: int('RATE_LIMIT_PUBLIC', 240),
    media: int('RATE_LIMIT_MEDIA', 600),
    adminApi: int('RATE_LIMIT_ADMIN', 300),
    upload: int('RATE_LIMIT_UPLOAD', 30),
    login: int('RATE_LIMIT_LOGIN', 8),
    telegram: int('RATE_LIMIT_TELEGRAM', 120),
  },

  /** Security audit log retention. */
  auditRetentionDays: int('AUDIT_RETENTION_DAYS', 30),
}

export function log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  const stamp = new Date().toISOString()
  const suffix = meta === undefined ? '' : ` ${safeJson(meta)}`
  const line = `[${stamp}] ${level.toUpperCase()} ${message}${suffix}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === 'string' && item.length > 200) return `${item.slice(0, 200)}…`
      return item
    })
  } catch {
    return '[unserializable]'
  }
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export type AppConfig = typeof config