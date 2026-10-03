import { config, log } from '../config.ts'
import { db } from '../db.ts'
import { TrackService, ValidationError } from '../services/tracks.ts'
import { SettingsService, SETTING_KEYS } from '../services/settings.ts'
import { AuditService } from '../services/audit.ts'
import { validateUpload, humanSize } from '../storage.ts'
import { BotSessions, type Draft } from './sessions.ts'
import { TelegramApi, escapeHtml, formatDuration, type TelegramFile, type TelegramUpdate } from './api.ts'

const DENIED = 'Доступ запрещён.'

const ADMIN_MENU = [
  [
    { text: 'Добавить трек', callback_data: 'adm:add' },
    { text: 'Список треков', callback_data: 'adm:tracks' },
  ],
  [
    { text: 'Статистика', callback_data: 'adm:stats' },
    { text: 'Управление сайтом', callback_data: 'adm:site' },
  ],
  [
    { text: 'Настройки', callback_data: 'adm:settings' },
    { text: 'Логи', callback_data: 'adm:logs' },
  ],
]

const PUBLIC_MENU = [[{ text: 'Список треков', callback_data: 'pub:list' }]]

const ADMIN_COMMANDS = new Set(['/menu', '/add', '/edit', '/tracks', '/stats', '/site', '/settings', '/logs', '/publish', '/unpublish', '/delete'])

function isAdmin(userId: number | undefined): boolean {
  if (!userId || !config.telegram.adminId) return false
  return String(userId) === config.telegram.adminId
}

function keyboard(rows: { text: string; callback_data: string }[][]) {
  return { inline_keyboard: rows }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function summary(draft: Draft): string {
  const cover = draft.coverFileId ? 'приложена' : 'не приложена'
  const description = draft.description ? escapeHtml(truncate(draft.description, 300)) : '—'
  return [
    'Проверьте данные перед публикацией:',
    '',
    `Название: ${escapeHtml(draft.title ?? '')}`,
    `Исполнитель: ${escapeHtml(draft.artist ?? '')}`,
    `Длительность: ${formatDuration(draft.duration ?? null)}`,
    `Размер: ${humanSize(draft.size ?? 0)}`,
    `Обложка: ${cover}`,
    '',
    `Описание: ${description}`,
  ].join('\n')
}

function confirmKeyboard(trackId?: number) {
  if (trackId) {
    return keyboard([
      [
        { text: 'Опубликовать', callback_data: `adm:pub:${trackId}` },
        { text: 'Снять с публикации', callback_data: `adm:unpub:${trackId}` },
      ],
      [
        { text: 'Удалить', callback_data: `adm:del:${trackId}` },
        { text: 'Закрыть', callback_data: 'adm:tracks' },
      ],
    ])
  }

  return keyboard([
    [
      { text: 'Опубликовать', callback_data: 'flow:confirm' },
      { text: 'Отмена', callback_data: 'adm:cancel' },
    ],
  ])
}

function publishedList(): string {
  const tracks = TrackService.listPublished()
  if (!tracks.length) return 'Опубликованных треков пока нет.'
  const lines = tracks
    .slice(0, 40)
    .map((track, index) => `${index + 1}. ${escapeHtml(track.title)} — ${escapeHtml(track.artist)} · ${formatDuration(track.duration)}`)
  const total = TrackService.stats().total
  return [`Опубликованные треки (${tracks.length} из ${total}):`, '', ...lines].join('\n')
}

function adminList(): string {
  const tracks = TrackService.listAll()
  if (!tracks.length) return 'Треков пока нет. Добавьте первый через кнопку «Добавить трек».'

  const lines = tracks
    .slice(0, 30)
    .map(
      (track) =>
        `${track.published ? 'опубликован' : 'черновик'} · #${track.id} ${escapeHtml(track.title)} — ${escapeHtml(track.artist)} · ${formatDuration(track.duration)} · ${humanSize(track.audioSize)} · ${track.source}`,
    )

  return ['Треки:', '', ...lines].join('\n')
}

function statsText(): string {
  const stats = TrackService.stats()
  const sessions = (
    db.prepare("SELECT COUNT(*) AS count FROM admin_sessions WHERE datetime(expires_at) > datetime('now')").get() as {
      count: number
    }
  ).count
  const logs = (db.prepare('SELECT COUNT(*) AS count FROM admin_logs').get() as { count: number }).count

  const newest = stats.newest.length
    ? `\n\nПоследние:\n${stats.newest
        .map((item) => `#${item.id} ${escapeHtml(item.title)} — ${escapeHtml(item.artist)}`)
        .join('\n')}`
    : ''

  return [
    'Статистика',
    '',
    `Всего треков: ${stats.total}`,
    `Опубликовано: ${stats.published}`,
    `Черновиков: ${stats.drafts}`,
    `Прослушиваний: ${stats.plays}`,
    `Объём аудио: ${humanSize(stats.bytes)}`,
    `Активных сессий: ${sessions}`,
    `Записей в логах: ${logs}`,
    ...(stats.bySource.length ? ['', 'Источники:', ...stats.bySource.map((item) => `${item.source}: ${item.count}`)] : []),
    newest,
  ].join('\n')
}

function siteText(): string {
  const settings = SettingsService.all()
  const stats = TrackService.stats()
  return [
    'Сайт',
    '',
    `Заголовок: ${escapeHtml(settings.site_title)}`,
    `Роль: ${escapeHtml(settings.site_role)}`,
    `Заголовок hero: ${escapeHtml(settings.site_headline)}`,
    `Музыка: ${settings.music_enabled === '1' ? 'включена' : 'выключена'}`,
    `Опубликовано треков: ${stats.published}`,
    `Telegram: ${escapeHtml(settings.contact_telegram)} (${escapeHtml(settings.contact_telegram_url)})`,
    '',
    'Полное управление: админ-панель и раздел «Настройки».',
  ].join('\n')
}

function settingsText(): string {
  const settings = SettingsService.all()
  const rows = SETTING_KEYS.map((key) => [
    { text: `${key} = ${truncate(settings[key] || '—', 24)}`, callback_data: `adm:setting:${key}` },
  ])
  return ['Настройки сайта. Нажмите параметр, чтобы изменить значение:', '', ...rows.map((row) => `- ${row[0]!.text}`)].join('\n')
}

const EDIT_FIELDS = [
  { key: 'title', label: 'Название' },
  { key: 'artist', label: 'Исполнитель' },
  { key: 'description', label: 'Описание' },
] as const

type EditField = (typeof EDIT_FIELDS)[number]['key']

function isEditField(value: string | undefined): value is EditField {
  return EDIT_FIELDS.some((field) => field.key === value)
}

function editKeyboard(trackId: number): ReturnType<typeof keyboard> {
  return keyboard([
    EDIT_FIELDS.map((field) => ({
      text: field.label,
      callback_data: `adm:editset:${trackId}:${field.key}`,
    })),
    [
      { text: 'Новое аудио', callback_data: `adm:editset:${trackId}:audio` },
      { text: 'Новая обложка', callback_data: `adm:editset:${trackId}:cover` },
    ],
    [
      { text: 'Опубликован', callback_data: `adm:pub:${trackId}` },
      { text: 'Закрыть', callback_data: 'adm:tracks' },
    ],
  ])
}

function editSummary(track: { id: number; title: string; artist: string; published: boolean; description: string; hasCover: boolean }): string {
  return [
    `Редактирование #${track.id}`,
    '',
    `Название: ${escapeHtml(track.title)}`,
    `Исполнитель: ${escapeHtml(track.artist)}`,
    `Статус: ${track.published ? 'опубликован' : 'черновик'}`,
    `Обложка: ${track.hasCover ? 'есть' : 'нет'}`,
    track.description ? `Описание: ${escapeHtml(truncate(track.description, 300))}` : 'Описание: —',
    '',
    'Выберите поле ниже или отправьте новое значение одной командой:',
    '<code>/title Текст</code> · <code>/artist Текст</code> · <code>/description Текст</code>',
  ].join('\n')
}

async function applyEditField(chatId: number, chatName: string, trackId: number, field: string, value: string) {
  if (isEditField(field)) {
    try {
      const track = TrackService.update(trackId, { [field]: value })
      AuditService.record('track.updated', 'telegram', null, { id: trackId, field, chat: chatName })
      await TelegramApi.sendMessage(chatId, `${field} обновлён.\n\n${editSummary(track)}`, {
        reply_markup: editKeyboard(trackId),
      })
    } catch (error) {
      await TelegramApi.sendMessage(chatId, (error as Error).message, { reply_markup: editKeyboard(trackId) })
    }
    return
  }
  await TelegramApi.sendMessage(chatId, 'Неизвестное поле.', { reply_markup: editKeyboard(trackId) })
}

function settingsKeyboard() {
  const settings = SettingsService.all()
  const rows: { text: string; callback_data: string }[][] = []
  for (const key of SETTING_KEYS) {
    rows.push([{ text: `${key}: ${truncate(settings[key] || '—', 26)}`, callback_data: `adm:setting:${key}` }])
  }
  return keyboard(rows)
}

function logsText(): string {
  const entries = AuditService.recent(15)
  if (!entries.length) return 'Лог пуст.'
  return [
    'Последние действия:',
    '',
    ...entries.map(
      (entry) => `${entry.created_at} · ${entry.actor} · ${entry.action}`,
    ),
  ].join('\n')
}

type DownloadResult = { ok: true; buffer: Buffer; mime: string } | { ok: false; error: string }

async function downloadAndValidate(fileId: string, kind: 'audio' | 'image'): Promise<DownloadResult> {
  const max = kind === 'audio' ? config.limits.maxAudioBytes : config.limits.maxCoverBytes
  const downloaded = await TelegramApi.downloadFile(fileId, max)
  if (!downloaded) return { ok: false, error: 'Не удалось загрузить файл или он превышает лимит' }

  const checked = validateUpload(downloaded.buffer, kind)
  if (!checked.ok) return { ok: false, error: checked.reason }
  return { ok: true, buffer: checked.buffer, mime: checked.detected.mime }
}

async function publishDraft(chatId: number, draft: Draft, chatName: string) {
  if (!draft.fileId) {
    await TelegramApi.sendMessage(chatId, 'Не найден аудиофайл. Начните заново: /add')
    return
  }

  const audio = await downloadAndValidate(draft.fileId, 'audio')
  if (!audio.ok) {
    await TelegramApi.sendMessage(chatId, `${audio.error}\n\nНачните заново: /add`)
    BotSessions.reset(chatId)
    return
  }

  let cover: Buffer | null = null
  if (draft.coverFileId) {
    const result = await downloadAndValidate(draft.coverFileId, 'image')
    if (!result.ok) {
      await TelegramApi.sendMessage(chatId, `Обложка отклонена: ${result.error}\nПродолжаю без обложки.`)
    } else {
      cover = result.buffer
    }
  }

  try {
    const track = TrackService.create({
      title: draft.title ?? '',
      artist: draft.artist ?? '',
      description: draft.description ?? '',
      audio: audio.buffer,
      cover,
      published: true,
      source: 'telegram',
      duration: draft.duration ?? null,
    })

    BotSessions.reset(chatId)
    AuditService.record('track.created', 'telegram', null, {
      id: track.id,
      title: track.title,
      chat: chatName,
      published: true,
    })

    await TelegramApi.sendMessage(
      chatId,
      [
        'Трек успешно опубликован.',
        '',
        `${escapeHtml(track.title)} — ${escapeHtml(track.artist)}`,
        `ID: ${track.id} · ${formatDuration(track.duration)} · ${humanSize(track.audioSize)}`,
        `Источник: Telegram`,
      ].join('\n'),
      { reply_markup: confirmKeyboard(track.id) },
    )
  } catch (error) {
    const message = error instanceof ValidationError ? error.message : 'Не удалось сохранить трек'
    log('error', 'telegram publish failed', { error: (error as Error).message })
    AuditService.record('track.create_failed', 'telegram', null, { error: message })
    await TelegramApi.sendMessage(chatId, `${message}\n\nНачните заново: /add`)
    BotSessions.reset(chatId)
  }
}

function extractTelegramAudio(message: NonNullable<TelegramUpdate['message']>): TelegramFile | null {
  return message.audio ?? message.voice ?? (message.document?.mime_type?.startsWith('audio/') ? message.document : null)
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) return handleCallback(update.callback_query)
  const message = update.message
  if (!message) return

  const chatId = message.chat.id
  const userId = message.from?.id
  const chatName = String(userId ?? 'unknown')
  const session = BotSessions.get(chatId)
  const draft: Draft = { ...session.draft }
  const text = message.text?.trim() ?? ''

  if (!isAdmin(userId)) {
    // Public catalogue stays available to everyone; everything else is admin-only.
    if (text.startsWith('/start') || text.startsWith('/help')) {
      await TelegramApi.sendMessage(
        chatId,
        'Музыкальный раздел сайта kсенже.\n\nОпубликованные треки доступны в этом боте и на сайте.',
        { reply_markup: PUBLIC_MENU },
      )
      return
    }
    if (text === '/tracks' || text === '/music') {
      await TelegramApi.sendMessage(chatId, publishedList(), { reply_markup: PUBLIC_MENU })
      return
    }
    if (text || session.step !== 'idle') {
      AuditService.record('bot.denied', 'telegram', null, { chat: chatName })
      await TelegramApi.sendMessage(chatId, DENIED)
      return
    }
    return
  }

  // ── commands ────────────────────────────────────────────────────────────
  if (text === '/cancel' || text === 'отмена') {
    BotSessions.reset(chatId)
    await TelegramApi.sendMessage(chatId, 'Действие отменено.', { reply_markup: keyboard(ADMIN_MENU) })
    return
  }

  if (session.step === 'await_setting' && draft.settingKey) {
    const key = draft.settingKey
    if (!text) {
      await TelegramApi.sendMessage(chatId, 'Нужно текстовое значение. Отмена: /cancel')
      return
    }
    try {
      SettingsService.update({ [key]: text } as never)
      AuditService.record('settings.updated', 'telegram', null, { key })
      await TelegramApi.sendMessage(
        chatId,
        `Параметр <code>${escapeHtml(key)}</code> обновлён.`,
        { reply_markup: settingsKeyboard() },
      )
    } catch (error) {
      await TelegramApi.sendMessage(chatId, `Не обновлено: ${(error as Error).message}`)
    }
    BotSessions.reset(chatId)
    return
  }

  if (session.step === 'await_edit_value' && draft.editId) {
    if (!text) {
      await TelegramApi.sendMessage(chatId, 'Нужно текстовое значение. Отмена: /cancel')
      return
    }
    await applyEditField(chatId, chatName, draft.editId, draft.editField ?? 'title', text)
    BotSessions.reset(chatId)
    return
  }

  if (session.step === 'await_edit_audio' && draft.editId) {
    const replacement = extractTelegramAudio(message)
    if (!replacement) {
      await TelegramApi.sendMessage(chatId, 'Нужен аудиофайл (MP3, M4A, OGG, WAV, FLAC). Отмена: /cancel')
      return
    }
    const checked = await downloadAndValidate(replacement.file_id, 'audio')
    if (!checked.ok) {
      AuditService.record('upload.rejected', 'telegram', null, { reason: checked.error })
      await TelegramApi.sendMessage(chatId, checked.error)
      return
    }
    try {
      const track = TrackService.update(draft.editId, { audio: checked.buffer, duration: message.audio?.duration ?? null })
      AuditService.record('track.updated', 'telegram', null, { id: track.id, field: 'audio', chat: chatName })
      await TelegramApi.sendMessage(chatId, `Аудио заменено.\n\n${editSummary(track)}`, {
        reply_markup: editKeyboard(track.id),
      })
    } catch (error) {
      await TelegramApi.sendMessage(chatId, (error as Error).message, { reply_markup: editKeyboard(draft.editId) })
    }
    BotSessions.reset(chatId)
    return
  }

  if (session.step === 'await_edit_cover' && draft.editId) {
    const photo = message.photo?.at(-1)
    if (!photo) {
      await TelegramApi.sendMessage(chatId, 'Нужна обложка изображением (JPEG, PNG, WebP). Отмена: /cancel')
      return
    }
    const checked = await downloadAndValidate(photo.file_id, 'image')
    if (!checked.ok) {
      await TelegramApi.sendMessage(chatId, checked.error)
      return
    }
    try {
      const track = TrackService.update(draft.editId, { cover: checked.buffer })
      AuditService.record('track.updated', 'telegram', null, { id: track.id, field: 'cover', chat: chatName })
      await TelegramApi.sendMessage(chatId, `Обложка обновлена.\n\n${editSummary(track)}`, {
        reply_markup: editKeyboard(track.id),
      })
    } catch (error) {
      await TelegramApi.sendMessage(chatId, (error as Error).message, { reply_markup: editKeyboard(draft.editId) })
    }
    BotSessions.reset(chatId)
    return
  }

  // Media messages carry no text, so an empty `text` must not be treated as `/menu`:
// attachments have to reach the conversation handlers below.
  const hasAttachment = Boolean(
    message.audio ?? message.voice ?? message.document ?? message.photo ?? message.caption,
  )

  if (text === '/start' || text === '/menu' || (text === '' && !hasAttachment)) {
    BotSessions.reset(chatId)
    await TelegramApi.sendMessage(chatId, 'Главное меню', { reply_markup: keyboard(ADMIN_MENU) })
    return
  }

  if (text === '/add') {
    BotSessions.save(chatId, 'await_audio', {})
    await TelegramApi.sendMessage(
      chatId,
      [
        'Отправьте аудиофайл (MP3, M4A, OGG, WAV, FLAC).',
        '',
        'Можно сразу указать данные в подписи к файлу:',
        '<code>Название — Исполнитель</code>',
        '',
        'Описание и обложку спросим следующими шагами.',
        '',
        'Загружайте только музыку, на которую у вас есть необходимые права или разрешение.',
      ].join('\n'),
    )
    return
  }

  if (text === '/tracks') {
    await TelegramApi.sendMessage(chatId, adminList())
    return
  }

  if (text === '/help') {
    await TelegramApi.sendMessage(
      chatId,
      [
        'Команды бота:',
        '',
        '/menu — главное меню',
        '/add — загрузить новый трек',
        '/edit [ID] — редактировать трек (ID можно пропустить)',
        '/tracks — все треки, /stats — статистика',
        '/publish ID · /unpublish ID · /delete ID',
        '/site — данные сайта, /settings — настройки, /logs — журнал',
        '/cancel — прервать текущее действие',
        '',
        'Прямое редактирование: <code>/title ID Текст</code>, <code>/artist ID Текст</code>, <code>/description ID Текст</code>',
      ].join('\n'),
      { reply_markup: keyboard(ADMIN_MENU) },
    )
    return
  }

  if (text.startsWith('/edit')) {
    const [rawId, inlineValue] = text.slice('/edit'.length).trim().split(/\s+/, 2)
    const id = Number.parseInt(rawId ?? '', 10)
    const track = Number.isInteger(id) ? TrackService.getAdmin(id) : null

    if (!track) {
      const tracks = TrackService.listAll().slice(0, 20)
      const rows = tracks.map((item) => [
        { text: `${item.published ? '●' : '○'} #${item.id} ${truncate(item.title, 18)}`, callback_data: `adm:editopen:${item.id}` },
      ])
      await TelegramApi.sendMessage(
        chatId,
        tracks.length ? ['Выберите трек для редактирования:', '', '/edit <ID> — открыть напрямую.'].join('\n') : 'Треков пока нет.',
        { reply_markup: rows.length ? keyboard(rows) : undefined },
      )
      return
    }

    const inlineField = rawId !== undefined && !/^\d+$/.test(rawId) ? rawId : undefined
    if (isEditField(inlineField)) {
      await applyEditField(chatId, chatName, id, inlineField, inlineValue ?? '')
      return
    }

    await TelegramApi.sendMessage(chatId, editSummary(track), { reply_markup: editKeyboard(id) })
    return
  }

  // Direct field edits: /title <ID> <value>, /artist <ID> <value>, /description <ID> <value>
  const inlineMatch = /^\/(title|artist|description)\s+(\d+)\s+([\s\S]+)$/.exec(text)
  if (inlineMatch) {
    const [, field, rawTrackId, value] = inlineMatch as unknown as [string, EditField, string, string]
    await applyEditField(chatId, chatName, Number.parseInt(rawTrackId, 10), field, value.trim())
    return
  }

  if (text === '/stats') {
    await TelegramApi.sendMessage(chatId, statsText())
    return
  }

  if (text === '/site') {
    await TelegramApi.sendMessage(chatId, siteText())
    return
  }

  if (text === '/settings') {
    await TelegramApi.sendMessage(chatId, settingsText(), { reply_markup: settingsKeyboard() })
    return
  }

  if (text === '/logs') {
    await TelegramApi.sendMessage(chatId, logsText())
    return
  }

  // Unknown slash command: point the admin at the supported list instead of silence.
  if (text.startsWith('/')) {
    const known =
      ADMIN_COMMANDS.has(text.split(' ')[0] ?? '') ||
      text === '/cancel' ||
      text === '/help' ||
      /^\/(title|artist|description)\b/.test(text)
    if (!known) {
      await TelegramApi.sendMessage(chatId, `Неизвестная команда. Список команд: /help`, {
        reply_markup: keyboard(ADMIN_MENU),
      })
    }
    return
  }

  // ── conversation ────────────────────────────────────────────────────────
  const audio = extractTelegramAudio(message)

  if (audio && (session.step === 'idle' || session.step === 'await_audio')) {
    const checked = await downloadAndValidate(audio.file_id, 'audio')
    if (!checked.ok) {
      AuditService.record('upload.rejected', 'telegram', null, { reason: checked.error })
      await TelegramApi.sendMessage(chatId, checked.error)
      return
    }

    const caption = (message.caption ?? '').trim()
    const [captionTitle, captionArtist] = caption.split(/\s+[—–-]\s+/, 2).map((part) => part.trim())

    draft.fileId = audio.file_id
    draft.mimeType = checked.mime
    draft.size = audio.file_size ?? 0
    draft.duration = audio.duration ?? undefined
    draft.title = captionTitle && captionTitle.length > 1 ? captionTitle : undefined
    draft.artist = captionArtist && captionArtist.length > 1 ? captionArtist : undefined

    if (draft.title && draft.artist) {
      BotSessions.save(chatId, 'await_description', draft)
      await TelegramApi.sendMessage(chatId, 'Принято. Отправьте описание трека (или «-», чтобы пропустить).')
      return
    }

    BotSessions.save(chatId, 'await_title', draft)
    await TelegramApi.sendMessage(chatId, 'Принято. Введите название трека:')
    return
  }

  switch (session.step) {
    case 'await_title':
      if (!text) return
      draft.title = text
      BotSessions.save(chatId, 'await_artist', draft)
      await TelegramApi.sendMessage(chatId, 'Введите исполнителя:')
      return

    case 'await_artist':
      if (!text) return
      draft.artist = text
      BotSessions.save(chatId, 'await_description', draft)
      await TelegramApi.sendMessage(chatId, 'Отправьте описание трека (или «-», чтобы пропустить).')
      return

    case 'await_description':
      draft.description = text && text !== '-' ? text : ''
      BotSessions.save(chatId, 'await_cover', draft)
      await TelegramApi.sendMessage(
        chatId,
        'Отправьте обложку (JPEG, PNG, WebP) или нажмите «Без обложки».',
        {
          reply_markup: keyboard([[{ text: 'Без обложки', callback_data: 'flow:cover_skip' }]]),
        },
      )
      return

    case 'await_cover': {
      const photo = message.photo?.[message.photo.length - 1]
      if (photo) {
        draft.coverFileId = photo.file_id
        BotSessions.save(chatId, 'await_confirm', draft)
        await TelegramApi.sendMessage(chatId, summary(draft), { reply_markup: confirmKeyboard() })
        return
      }
      if (audio) {
        await TelegramApi.sendMessage(chatId, 'Нужна обложка изображением или нажмите «Без обложки».')
        return
      }
      return
    }

    case 'await_confirm':
      if (text === 'да' || text === 'ок' || text === 'опубликовать') {
        await publishDraft(chatId, draft, chatName)
        return
      }
      if (text === 'отмена' || text === 'нет') {
        BotSessions.reset(chatId)
        await TelegramApi.sendMessage(chatId, 'Публикация отменена.', { reply_markup: keyboard(ADMIN_MENU) })
        return
      }
      await TelegramApi.sendMessage(chatId, summary(draft), { reply_markup: confirmKeyboard() })
      return

    default:
      return
  }
}

async function handleCallback(query: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
  const data = query.data ?? ''
  const userId = query.from?.id
  // callback_query has no chat id, so it is taken from the message being answered.
  const targetChat = query.message?.chat?.id
  if (!targetChat) return

  if (!isAdmin(userId)) {
    AuditService.record('bot.denied', 'telegram', null, { chat: String(userId ?? 'unknown'), data })
    await TelegramApi.answerCallback(query.id, DENIED)
    return
  }

  await TelegramApi.answerCallback(query.id)

  const [scope, action, argument, extra] = data.split(':')

  if (scope === 'pub' && action === 'list') {
    await TelegramApi.sendMessage(targetChat, publishedList())
    return
  }

  if (scope === 'flow' && action === 'cover_skip') {
    const session = BotSessions.get(targetChat)
    const draft = { ...session.draft }
    draft.coverFileId = undefined
    BotSessions.save(targetChat, 'await_confirm', draft)
    await TelegramApi.sendMessage(targetChat, summary(draft), { reply_markup: confirmKeyboard() })
    return
  }

  if (scope === 'flow' && action === 'confirm') {
    const session = BotSessions.get(targetChat)
    await publishDraft(targetChat, session.draft, String(userId ?? 'unknown'))
    return
  }

  if (scope === 'adm') {
    if (action === 'add') {
      BotSessions.save(targetChat, 'await_audio', {})
      await TelegramApi.sendMessage(targetChat, 'Отправьте аудиофайл. Данные можно указать в подписи: <code>Название — Исполнитель</code>.')
      return
    }
    if (action === 'tracks') {
      const tracks = TrackService.listAll()
      const rows = tracks.slice(0, 20).map((track) => [
        { text: `${track.published ? '●' : '○'} #${track.id} ${truncate(track.title, 18)}`, callback_data: `adm:open:${track.id}` },
      ])
      await TelegramApi.sendMessage(
        targetChat,
        tracks.length ? adminList() : 'Треков пока нет.',
        { reply_markup: rows.length ? keyboard(rows) : undefined },
      )
      return
    }
    if (action === 'editopen') {
      const id = Number.parseInt(argument ?? '', 10)
      const track = Number.isInteger(id) ? TrackService.getAdmin(id) : null
      if (!track) {
        await TelegramApi.sendMessage(targetChat, 'Трек не найден.')
        return
      }
      await TelegramApi.sendMessage(targetChat, editSummary(track), { reply_markup: editKeyboard(track.id) })
      return
    }
    if (action === 'editset') {
      const id = Number.parseInt(argument ?? '', 10)
      const track = Number.isInteger(id) ? TrackService.getAdmin(id) : null
      if (!track) {
        await TelegramApi.sendMessage(targetChat, 'Трек не найден.', { reply_markup: keyboard(ADMIN_MENU) })
        return
      }
      const field = extra ?? ''

      if (isEditField(field)) {
        BotSessions.save(targetChat, 'await_edit_value', { editId: track.id, editField: field })
        const label = EDIT_FIELDS.find((item) => item.key === field)?.label ?? field
        await TelegramApi.sendMessage(
          targetChat,
          [`Новое значение для «${label}» трека #${track.id}:`, '', `Сейчас: ${escapeHtml(truncate(String(track[field] || '—'), 200))}`, '', 'Отправьте текст. Отмена: /cancel'].join('\n'),
        )
        return
      }

      if (field === 'audio') {
        BotSessions.save(targetChat, 'await_edit_audio', { editId: track.id })
        await TelegramApi.sendMessage(
          targetChat,
          `Отправьте новый аудиофайл для #${track.id}. Старый файл будет заменён. Отмена: /cancel`,
        )
        return
      }

      if (field === 'cover') {
        BotSessions.save(targetChat, 'await_edit_cover', { editId: track.id })
        await TelegramApi.sendMessage(
          targetChat,
          `Отправьте новую обложку для #${track.id} (JPEG, PNG, WebP). Отмена: /cancel`,
        )
        return
      }

      await TelegramApi.sendMessage(targetChat, 'Неизвестное действие.', { reply_markup: editKeyboard(track.id) })
      return
    }
    if (action === 'open') {
      const id = Number.parseInt(argument ?? '', 10)
      const track = Number.isInteger(id) ? TrackService.getAdmin(id) : null
      if (!track) {
        await TelegramApi.sendMessage(targetChat, 'Трек не найден.')
        return
      }
      await TelegramApi.sendMessage(
        targetChat,
        [
          `#${track.id} ${escapeHtml(track.title)} — ${escapeHtml(track.artist)}`,
          '',
          `Статус: ${track.published ? 'опубликован' : 'черновик'}`,
          `Источник: ${track.source}`,
          `Длительность: ${formatDuration(track.duration)}`,
          `Размер: ${humanSize(track.audioSize)}`,
          `Обложка: ${track.hasCover ? 'есть' : 'нет'}`,
          track.description ? `\nОписание: ${escapeHtml(truncate(track.description, 400))}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        { reply_markup: confirmKeyboard(track.id) },
      )
      return
    }
    if (action === 'stats') {
      await TelegramApi.sendMessage(targetChat, statsText())
      return
    }
    if (action === 'site') {
      await TelegramApi.sendMessage(targetChat, siteText())
      return
    }
    if (action === 'settings') {
      await TelegramApi.sendMessage(targetChat, settingsText(), { reply_markup: settingsKeyboard() })
      return
    }
    if (action === 'setting') {
      BotSessions.save(targetChat, 'await_setting', { settingKey: argument })
      await TelegramApi.sendMessage(
        targetChat,
        [
          `Новое значение для <code>${escapeHtml(argument ?? '')}</code>:`,
          '',
          'Отправьте текст. Отмена: /cancel',
        ].join('\n'),
      )
      return
    }
    if (action === 'logs') {
      await TelegramApi.sendMessage(targetChat, logsText())
      return
    }
    if (action === 'pub' || action === 'unpub') {
      const id = Number.parseInt(argument ?? '', 10)
      try {
        const track = TrackService.setPublished(id, action === 'pub')
        AuditService.record(action === 'pub' ? 'track.published' : 'track.unpublished', 'telegram', null, {
          id,
          title: track.title,
        })
        await TelegramApi.sendMessage(
          targetChat,
          `${action === 'pub' ? 'Опубликован' : 'Снят с публикации'}: #${track.id} ${escapeHtml(track.title)}`,
          { reply_markup: confirmKeyboard(track.id) },
        )
      } catch (error) {
        await TelegramApi.sendMessage(targetChat, (error as Error).message)
      }
      return
    }
    if (action === 'del') {
      const id = Number.parseInt(argument ?? '', 10)
      await TelegramApi.sendMessage(
        targetChat,
        `Удалить трек #${id}? Это действие необратимо.`,
        {
          reply_markup: keyboard([
            [
              { text: 'Да, удалить', callback_data: `adm:delok:${id}` },
              { text: 'Отмена', callback_data: 'adm:tracks' },
            ],
          ]),
        },
      )
      return
    }
    if (action === 'delok') {
      const id = Number.parseInt(argument ?? '', 10)
      const row = Number.isInteger(id) ? TrackService.getAdmin(id) : null
      const removed = row ? TrackService.remove(id) : false
      AuditService.record(removed ? 'track.deleted' : 'track.delete_failed', 'telegram', null, {
        id,
        title: row?.title,
      })
      await TelegramApi.sendMessage(
        targetChat,
        removed ? `Трек #${id} удалён.` : 'Трек не найден.',
        { reply_markup: keyboard(ADMIN_MENU) },
      )
      return
    }
    if (action === 'cancel') {
      BotSessions.reset(targetChat)
      await TelegramApi.sendMessage(targetChat, 'Действие отменено.', { reply_markup: keyboard(ADMIN_MENU) })
      return
    }
  }

  await TelegramApi.sendMessage(targetChat, 'Неизвестная команда.')
}