import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { config, log } from './config.ts'

/** Magic byte signatures. Extensions are never trusted on their own. */
const SIGNATURES: { mime: string; ext: string; test: (head: Buffer) => boolean; kind: 'audio' | 'image' }[] = [
  { mime: 'audio/mpeg', ext: 'mp3', kind: 'audio', test: (h) => hasId3(h) || (h[0] === 0xff && (h[1]! & 0xe0) === 0xe0) },
  { mime: 'audio/mp4', ext: 'm4a', kind: 'audio', test: (h) => h.subarray(4, 8).toString('latin1') === 'ftyp' },
  { mime: 'audio/ogg', ext: 'ogg', kind: 'audio', test: (h) => h.subarray(0, 4).toString('latin1') === 'OggS' },
  { mime: 'audio/wav', ext: 'wav', kind: 'audio', test: (h) => h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WAVE' },
  { mime: 'audio/flac', ext: 'flac', kind: 'audio', test: (h) => h.subarray(0, 4).toString('latin1') === 'fLaC' },
  { mime: 'image/jpeg', ext: 'jpg', kind: 'image', test: (h) => h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff },
  { mime: 'image/png', ext: 'png', kind: 'image', test: (h) => h.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', kind: 'image', test: (h) => h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WEBP' },
]

function hasId3(head: Buffer): boolean {
  return head.subarray(0, 3).toString('latin1') === 'ID3'
}

export type Detected = { mime: string; ext: string; kind: 'audio' | 'image' }

export type ValidationResult =
  | { ok: true; detected: Detected; buffer: Buffer }
  | { ok: false; reason: string }

export function detectFileType(buffer: Buffer, expected: 'audio' | 'image'): Detected | null {
  const head = buffer.subarray(0, 16)
  for (const signature of SIGNATURES) {
    if (signature.kind !== expected) continue
    if (signature.test(head)) return { mime: signature.mime, ext: signature.ext, kind: signature.kind }
  }
  return null
}

export function validateUpload(
  buffer: Buffer,
  kind: 'audio' | 'image',
): ValidationResult {
  if (buffer.byteLength === 0) return { ok: false, reason: 'Пустой файл' }

  const limit = kind === 'audio' ? config.limits.maxAudioBytes : config.limits.maxCoverBytes
  if (buffer.byteLength > limit) {
    const mb = (buffer.byteLength / 1024 / 1024).toFixed(1)
    const max = Math.round(limit / 1024 / 1024)
    return { ok: false, reason: `Файл ${mb} МБ превышает лимит ${max} МБ` }
  }

  const detected = detectFileType(buffer, kind)
  if (!detected) {
    return {
      ok: false,
      reason:
        kind === 'audio'
          ? 'Неподдерживаемый формат аудио. Разрешены MP3, M4A, OGG, WAV, FLAC'
          : 'Неподдерживаемый формат обложки. Разрешены JPEG, PNG, WebP',
    }
  }

  // Reject files that only look like media but carry markup/script payloads.
  if (containsExecutablePayload(buffer)) {
    return { ok: false, reason: 'Файл содержит исполняемый или скриптовый код и отклонён' }
  }

  return { ok: true, detected, buffer }
}

const EXECUTABLE_MARKERS = [
  '<?php',
  '<script',
  '<!DOCTYPE html',
  '<html',
  '<svg',
  '#!/',
  'MZ',
]

function containsExecutablePayload(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 2048).toString('latin1').toLowerCase()
  if (head.startsWith('<?php') || head.startsWith('<script') || head.startsWith('#!')) return true
  if (head.startsWith('mz')) return true
  if (head.startsWith('<?xml')) return true
  // Markup embedded right after a valid media header means a polyglot file.
  const tail = buffer.subarray(-2048).toString('latin1').toLowerCase()
  return EXECUTABLE_MARKERS.some((marker) => tail.includes(marker) && tail.includes('<'))
}

/** Random stored name. The original filename is never used on disk. */
function storedName(ext: string): string {
  return `${Date.now().toString(36)}-${crypto.randomBytes(10).toString('hex')}.${ext}`
}

export function saveUpload(buffer: Buffer, kind: 'audio' | 'image'): { relative: string; mime: string; size: number } {
  const detected = detectFileType(buffer, kind)
  if (!detected) throw new Error('Unsupported file type')

  const folder = kind === 'audio' ? 'audio' : 'covers'
  const relative = `${folder}/${storedName(detected.ext)}`
  const absolute = resolveInside(relative)

  fs.writeFileSync(absolute, buffer, { mode: 0o640 })
  return { relative, mime: detected.mime, size: buffer.byteLength }
}

/**
 * Resolve a relative media path and refuse anything that escapes the storage root.
 */
export function resolveInside(relative: string): string {
  const root = path.resolve(config.storageDir)
  const target = path.resolve(root, relative)
  const withSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`
  if (target !== root && !target.startsWith(withSeparator)) {
    log('warn', 'path traversal attempt blocked', { relative })
    throw new Error('Invalid media path')
  }
  return target
}

export function deleteUpload(relative: string | null | undefined): void {
  if (!relative) return
  try {
    const absolute = resolveInside(relative)
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute)
  } catch (error) {
    log('warn', 'failed to delete stored file', { relative, error: (error as Error).message })
  }
}

export function fileSize(relative: string): number {
  try {
    return fs.statSync(resolveInside(relative)).size
  } catch {
    return 0
  }
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}