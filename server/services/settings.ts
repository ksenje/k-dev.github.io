import { db } from '../db.ts'
import { cleanText, ValidationError } from './tracks.ts'

/** Editable site settings, surfaced through the public site config endpoint. */
export const SETTING_KEYS = [
  'site_title',
  'site_role',
  'site_headline',
  'site_intro',
  'site_about',
  'site_music_note',
  'contact_telegram',
  'contact_telegram_url',
  'contact_payments',
  'contact_payments_url',
  'contact_crypto',
  'contact_crypto_url',
  'contact_ton',
  'telegram_channel',
  'music_enabled',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

export type SiteSettings = Record<SettingKey, string>

const MAX_SETTING_LENGTH: Partial<Record<SettingKey, number>> = {
  site_headline: 160,
  site_intro: 400,
  site_about: 1200,
  site_music_note: 400,
}

export const SettingsService = {
  all(): SiteSettings {
    const rows = db.prepare('SELECT key, value FROM settings').all() as unknown as {
      key: SettingKey
      value: string
    }[]
    const map = {} as SiteSettings
    for (const key of SETTING_KEYS) {
      const row = rows.find((item) => item.key === key)
      map[key] = row?.value ?? ''
    }
    return map
  },

  get(key: SettingKey): string {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? ''
  },

  update(patch: Partial<Record<SettingKey, string>>): SiteSettings {
    const statement = db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )

    for (const [key, value] of Object.entries(patch)) {
      if (!SETTING_KEYS.includes(key as SettingKey)) {
        throw new ValidationError(`Неизвестный параметр: ${key}`, key)
      }
      const typedKey = key as SettingKey
      const max = MAX_SETTING_LENGTH[typedKey] ?? 200

      if (typedKey === 'music_enabled') {
        if (value !== '0' && value !== '1') {
          throw new ValidationError('music_enabled принимает только 0 или 1', typedKey)
        }
        statement.run(typedKey, value)
        continue
      }

      if (typedKey.endsWith('_url') || typedKey === 'telegram_channel') {
        const url = cleanText(value, max, typedKey)
        if (url && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(url)) {
          throw new ValidationError('Некорректный URL: используйте https://', typedKey)
        }
        statement.run(typedKey, url)
        continue
      }

      statement.run(typedKey, cleanText(value, max, typedKey))
    }

    return SettingsService.all()
  },
}