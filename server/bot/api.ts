import { config, log } from '../config.ts'

type ApiResponse<T> = { ok: boolean; result?: T; description?: string }

export type TelegramUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; username?: string; first_name?: string }
    chat: { id: number; type: string }
    text?: string
    caption?: string
    audio?: TelegramFile
    voice?: TelegramFile
    document?: TelegramFile & { file_name?: string }
    photo?: (TelegramFile & { file_size?: number; width?: number; height?: number })[]
  }
  callback_query?: {
    id: string
    from?: { id: number }
    data?: string
    message_id?: number
    message?: { chat?: { id: number }; message_id?: number }
  }
}

export type TelegramFile = {
  file_id: string
  file_unique_id?: string
  file_name?: string
  mime_type?: string
  file_size?: number
  duration?: number
}

const BASE = config.telegram.apiBase

async function call<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = config.telegram.token
  if (!token) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(`${BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const data = (await response.json()) as ApiResponse<T>
    if (!data.ok) {
      log('warn', 'telegram api error', { method, description: data.description })
      return null
    }
    return data.result ?? null
  } catch (error) {
    log('error', 'telegram request failed', { method, error: (error as Error).message })
    return null
  } finally {
    clearTimeout(timer)
  }
}

export const TelegramApi = {
  enabled(): boolean {
    return Boolean(config.telegram.token && config.telegram.adminId)
  },

  sendMessage(chatId: number, text: string, options: Record<string, unknown> = {}): Promise<unknown> {
    return call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    })
  },

  editMessage(chatId: number, messageId: number, text: string, options: Record<string, unknown> = {}): Promise<unknown> {
    return call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...options,
    })
  },

  answerCallback(callbackId: string, text?: string): Promise<unknown> {
    return call('answerCallbackQuery', { callback_query_id: callbackId, text })
  },

  editReplyMarkup(chatId: number, messageId: number, markup: Record<string, unknown> | null): Promise<unknown> {
    return call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: markup })
  },

  deleteMessage(chatId: number, messageId: number): Promise<unknown> {
    return call('deleteMessage', { chat_id: chatId, message_id: messageId })
  },

  getFile(fileId: string): Promise<{ file_path: string } | null> {
    return call('getFile', { file_id: fileId })
  },

  async downloadFile(fileId: string, maxBytes: number): Promise<{ buffer: Buffer; fileName: string } | null> {
    const file = await call<{ file_path: string; file_size?: number }>('getFile', { file_id: fileId })
    if (!file?.file_path) return null
    if (file.file_size && file.file_size > maxBytes) {
      log('warn', 'telegram file too large', { fileId, size: file.file_size })
      return null
    }

    const token = config.telegram.token
    if (!token) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)

    try {
      const response = await fetch(`${BASE}/file/bot${token}/${file.file_path}`, { signal: controller.signal })
      if (!response.ok) return null

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.byteLength > maxBytes) return null
      return { buffer, fileName: file.file_path.split('/').pop() ?? 'file' }
    } catch (error) {
      log('error', 'telegram download failed', { fileId, error: (error as Error).message })
      return null
    } finally {
      clearTimeout(timer)
    }
  },

  getMe(): Promise<{ username?: string } | null> {
    return call('getMe', {})
  },

  async setWebhook(url: string, secret: string): Promise<boolean> {
    const result = await call('setWebhook', {
      url,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
      max_connections: 10,
    })
    return result !== null
  },

  async deleteWebhook(): Promise<void> {
    await call('deleteWebhook', { drop_pending_updates: false })
  },
}

/** Escapes user supplied text before it is inserted into HTML messages. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '--:--'
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}