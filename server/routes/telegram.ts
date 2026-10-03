import { Router } from 'express'
import { config, log } from '../config.ts'
import { handleUpdate } from '../bot/handler.ts'
import type { TelegramUpdate } from '../bot/api.ts'
import { AuditService, clientIp } from '../services/audit.ts'
import { requestSizeLimit } from '../middleware/security.ts'

export const telegramRouter = Router()

/**
 * Telegram webhook receiver.
 * The shared secret header is mandatory: without it nobody may push updates.
 */
telegramRouter.post('/webhook', requestSizeLimit(512 * 1024), (req, res) => {
  if (!config.telegram.token || !config.telegram.adminId) {
    res.status(503).json({ error: 'Bot is not configured' })
    return
  }

  const provided = req.headers['x-telegram-bot-api-secret-token']
  if (!config.telegram.webhookSecret || provided !== config.telegram.webhookSecret) {
    AuditService.record('telegram.webhook.rejected', 'system', clientIp(req))
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const update = req.body as TelegramUpdate
  // Telegram retries until it gets 2xx, so acknowledge first and work after.
  res.json({ ok: true })

  void handleUpdate(update).catch((error) => {
    log('error', 'telegram update failed', { error: (error as Error).message })
  })
})

telegramRouter.get('/status', (_req, res) => {
  res.json({
    configured: Boolean(config.telegram.token && config.telegram.adminId && config.telegram.webhookSecret),
    adminIdConfigured: Boolean(config.telegram.adminId),
    webhookUrlConfigured: Boolean(config.telegram.webhookUrl),
  })
})