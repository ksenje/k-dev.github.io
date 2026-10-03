import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { config, log } from './config.ts'
import { db, purgeExpired } from './db.ts'
import { cors, requestTimeout, securityHeaders } from './middleware/security.ts'
import { loadSession, requireAdmin, requireCsrf } from './middleware/auth.ts'
import { rateLimit } from './middleware/rateLimit.ts'
import { adminRouter, publicRouter } from './routes/api.ts'
import { authRouter } from './routes/auth.ts'
import { mediaRouter } from './routes/media.ts'
import { telegramRouter } from './routes/telegram.ts'
import { AuditService } from './services/audit.ts'
import { TelegramApi } from './bot/api.ts'

const app = express()
app.disable('x-powered-by')
if (config.trustProxy) app.set('trust proxy', 1)

app.use(requestTimeout(config.limits.requestTimeoutMs))
app.use(securityHeaders)
app.use(cors)
app.use(express.json({ limit: config.limits.maxJsonBytes, strict: true }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: config.nodeEnv,
    telegram: TelegramApi.enabled(),
    uptime: Math.round(process.uptime()),
  })
})

app.use('/api/auth', authRouter)

app.use(
  '/api/admin',
  loadSession,
  requireAdmin,
  requireCsrf,
  rateLimit({ scope: 'admin', limit: config.rateLimits.adminApi, bySession: true }),
  adminRouter,
)

app.use('/api/telegram', telegramRouter)
app.use('/api', publicRouter)
app.use('/media', mediaRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Production: the built frontend is served from the same origin as the API.
const indexFile = path.join(config.frontendDist, 'index.html')
if (fs.existsSync(indexFile)) {
  app.use(
    express.static(config.frontendDist, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store')
      },
    }),
  )

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.sendFile(indexFile, (error) => {
      if (error) next(error)
    })
  })
} else {
  app.use((_req, res) => {
    res.status(503).send('Frontend build not found. Run: npm run build')
  })
}

app.use((error: Error & { status?: number }, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof error.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 500
  if (status >= 500) {
    log('error', 'unhandled request error', { path: req.path, error: error.message })
    AuditService.record('server.error', 'system', null, { path: req.path })
  }
  res.status(status).json({ error: status >= 500 ? 'Внутренняя ошибка' : error.message })
})

async function start(): Promise<void> {
  const server = app.listen(config.port, config.host, () => {
    log('info', 'server listening', { url: `http://${config.host}:${config.port}`, env: config.nodeEnv })
  })

  server.headersTimeout = config.limits.requestTimeoutMs
  server.requestTimeout = config.limits.requestTimeoutMs

  const cleaner = setInterval(() => {
    try {
      purgeExpired()
    } catch (error) {
      log('error', 'cleanup failed', { error: (error as Error).message })
    }
  }, 60 * 60 * 1000)
  cleaner.unref()

  if (TelegramApi.enabled() && config.telegram.webhookUrl && config.telegram.webhookSecret) {
    const ok = await TelegramApi.setWebhook(config.telegram.webhookUrl, config.telegram.webhookSecret)
    log(ok ? 'info' : 'warn', `telegram webhook ${ok ? 'registered' : 'not registered'}`)
  } else if (!TelegramApi.enabled()) {
    log('warn', 'telegram bot disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_ID missing')
  }

  const shutdown = (signal: string) => {
    log('info', 'shutting down', { signal })
    void TelegramApi.deleteWebhook().catch(() => undefined)
    server.close(() => {
      try {
        db.close()
      } catch {
        /* already closed */
      }
      process.exit(0)
    })
    setTimeout(() => process.exit(0), 8000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  log('error', 'failed to start', { error: (error as Error).message })
  process.exit(1)
})