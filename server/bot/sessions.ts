import { db } from '../db.ts'

export type BotStep =
  | 'idle'
  | 'await_audio'
  | 'await_title'
  | 'await_artist'
  | 'await_description'
  | 'await_cover'
  | 'await_confirm'
  | 'await_setting'
  | 'await_edit_value'
  | 'await_edit_audio'
  | 'await_edit_cover'

export type Draft = {
  fileId?: string
  fileName?: string
  mimeType?: string
  size?: number
  duration?: number
  title?: string
  artist?: string
  description?: string
  coverFileId?: string
  settingKey?: string
  editId?: number
  editField?: string
}

export type BotSession = { step: BotStep; draft: Draft }

/** Conversation state survives bot restarts because it lives in SQLite. */
export const BotSessions = {
  get(chatId: number): BotSession {
    const row = db.prepare('SELECT step, payload FROM bot_sessions WHERE chat_id = ?').get(String(chatId)) as
      | { step: BotStep; payload: string }
      | undefined

    if (!row) return { step: 'idle', draft: {} }
    try {
      return { step: row.step, draft: JSON.parse(row.payload) as Draft }
    } catch {
      return { step: 'idle', draft: {} }
    }
  },

  save(chatId: number, step: BotStep, draft: Draft): void {
    db.prepare(
      `INSERT INTO bot_sessions (chat_id, step, payload, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(chat_id) DO UPDATE SET step = excluded.step, payload = excluded.payload,
                                         updated_at = datetime('now')`,
    ).run(String(chatId), step, JSON.stringify(draft).slice(0, 8000))
  },

  reset(chatId: number): void {
    db.prepare('DELETE FROM bot_sessions WHERE chat_id = ?').run(String(chatId))
  },
}