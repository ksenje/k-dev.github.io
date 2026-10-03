import type { Request } from 'express'
import Busboy from 'busboy'

export type UploadedFile = { field: string; buffer: Buffer; filename: string; mime: string }

export type MultipartResult = { files: UploadedFile[]; fields: Record<string, string> }

export class UploadError extends Error {}

/**
 * Buffers a multipart request in memory with hard size limits.
 * Files are never written to disk here: they are validated by magic bytes
 * before they are stored under a generated name.
 */
export function readMultipart(req: Request, maxBytes: number, maxFiles = 4): Promise<MultipartResult> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] ?? ''
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      reject(new UploadError('Ожидается multipart/form-data'))
      return
    }

    let busboy: Busboy.Busboy
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { files: maxFiles, fileSize: maxBytes, fields: 20, fieldSize: 4096 },
      })
    } catch {
      reject(new UploadError('Некорректный multipart запрос'))
      return
    }

    const files: UploadedFile[] = []
    const fields: Record<string, string> = {}
    const sizeError = () => new UploadError(`Файл превышает лимит ${Math.round(maxBytes / 1024 / 1024)} МБ`)
    let settled = false
    let total = 0

    const fail = (error: Error) => {
      if (settled) return
      settled = true
      req.unpipe(busboy)
      busboy.destroy()
      reject(error)
    }

    busboy.on('file', (field, stream, info) => {
      const chunks: Buffer[] = []
      let received = 0

      stream.on('data', (chunk: Buffer) => {
        received += chunk.length
        total += chunk.length
        if (received > maxBytes || total > maxBytes) {
          stream.resume()
          fail(sizeError())
          return
        }
        chunks.push(chunk)
      })

      stream.on('limit', () => fail(sizeError()))

      stream.on('end', () => {
        if (settled) return
        files.push({
          field,
          buffer: Buffer.concat(chunks),
          filename: info.filename ?? 'file',
          mime: info.mimeType ?? 'application/octet-stream',
        })
      })
    })

    busboy.on('field', (name, value) => {
      if (typeof value === 'string') fields[name] = value
    })

    busboy.on('error', () => fail(new UploadError('Не удалось разобрать запрос')))

    busboy.on('close', () => {
      if (settled) return
      settled = true
      resolve({ files, fields })
    })

    req.pipe(busboy)
  })
}