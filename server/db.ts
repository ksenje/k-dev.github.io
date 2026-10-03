import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { config, log } from './config.ts'

fs.mkdirSync(config.storageDir, { recursive: true })
fs.mkdirSync(path.join(config.storageDir, 'audio'), { recursive: true })
fs.mkdirSync(path.join(config.storageDir, 'covers'), { recursive: true })

export const db = new DatabaseSync(config.databaseFile)

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA busy_timeout = 5000')

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    artist        TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    audio_path    TEXT    NOT NULL,
    audio_mime    TEXT    NOT NULL,
    audio_size    INTEGER NOT NULL DEFAULT 0,
    cover_path    TEXT,
    cover_mime    TEXT,
    cover_size    INTEGER,
    duration      REAL,
    published     INTEGER NOT NULL DEFAULT 0,
    source        TEXT    NOT NULL DEFAULT 'admin',
    plays         INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tracks_published ON tracks (published, created_at DESC);

  CREATE TABLE IF NOT EXISTS admin_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    action      TEXT    NOT NULL,
    actor       TEXT    NOT NULL,
    actor_ip    TEXT,
    metadata    TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs (created_at DESC);

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id          TEXT PRIMARY KEY,
    token_hash  TEXT    NOT NULL,
    user_agent  TEXT    NOT NULL DEFAULT '',
    ip          TEXT    NOT NULL DEFAULT '',
    csrf        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_seen   TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions (expires_at);

  CREATE TABLE IF NOT EXISTS login_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ip         TEXT NOT NULL,
    ok         INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, created_at DESC);

  CREATE TABLE IF NOT EXISTS bot_sessions (
    chat_id     TEXT PRIMARY KEY,
    step        TEXT NOT NULL,
    payload     TEXT NOT NULL DEFAULT '{}',
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const defaultSettings: Record<string, string> = {
  site_title: 'kсенже',
  site_role: 'Python Developer',
  site_headline: 'Музыка, разработка и собственные проекты.',
  site_intro:
    'Я Python-разработчик, занимаюсь созданием различных программ и IT-решений.',
  site_about:
    'Создаю программные решения, Telegram-ботов, web-приложения, автоматизацию и собственные цифровые продукты.',
  site_music_note: 'Здесь появляются опубликованные треки.',
  contact_telegram: '@root_me',
  contact_telegram_url: 'https://t.me/root_me',
  contact_payments: '@send',
  contact_payments_url: 'https://t.me/send',
  contact_crypto: '@xrocket',
  contact_crypto_url: 'https://t.me/xrocket',
  contact_ton: 'UQCSCCAhJySGUarWjxXLP0Fx6YTnh6_n_vrpJ3zuL-_7ANml',
  telegram_channel: '',
  music_enabled: '1',
}

const insertSetting = db.prepare(
  'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING',
)
for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value)

export function purgeExpired(): void {
  db.prepare("DELETE FROM admin_sessions WHERE expires_at < datetime('now')").run()
  db.prepare(
    "DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')",
  ).run()
  db.prepare(
    `DELETE FROM admin_logs WHERE created_at < datetime('now', ?)`,
  ).run(`-${config.auditRetentionDays} days`)
  db.prepare("DELETE FROM bot_sessions WHERE updated_at < datetime('now', '-6 hours')").run()
}

log('info', 'database ready', { file: path.basename(config.databaseFile) })