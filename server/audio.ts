/**
 * Duration estimation from the file header.
 * Returns null when the container cannot be parsed; the client then falls back
 * to the duration reported by the browser media element.
 */
export function estimateDuration(buffer: Buffer, mime: string): number | null {
  try {
    if (mime === 'audio/wav') return wavDuration(buffer)
    if (mime === 'audio/mp4') return mp4Duration(buffer)
    if (mime === 'audio/mpeg') return mp3Duration(buffer)
  } catch {
    return null
  }
  return null
}

function wavDuration(buffer: Buffer): number | null {
  if (buffer.length < 44) return null
  const byteRate = buffer.readUInt32LE(28)
  const dataChunkIndex = buffer.indexOf('data', 0, 'latin1')
  if (dataChunkIndex < 0 || byteRate <= 0) return null
  const dataSize = buffer.readUInt32LE(dataChunkIndex + 4)
  return Math.round((dataSize / byteRate) * 100) / 100
}

function mp4Duration(buffer: Buffer): number | null {
  const index = buffer.indexOf('mvhd', 0, 'latin1')
  if (index < 0) return null
  const version = buffer[index + 4]!
  if (version === 0) {
    const timescale = buffer.readUInt32BE(index + 16)
    const duration = buffer.readUInt32BE(index + 20)
    if (!timescale) return null
    return Math.round((duration / timescale) * 100) / 100
  }
  const timescale = buffer.readUInt32BE(index + 24)
  const high = buffer.readUInt32BE(index + 28)
  const low = buffer.readUInt32BE(index + 32)
  if (!timescale) return null
  const duration = high * 2 ** 32 + low
  return Math.round((duration / timescale) * 100) / 100
}

const BITRATES_V1_L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
]
const BITRATES_V1_L2 = [
  0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0,
]
const BITRATES_V1_L1 = [
  0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0,
]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
const BITRATES_V2_L2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
const BITRATES_V2_L1 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0]
const SAMPLE_RATES = {
  3: { 0: 44100, 1: 48000, 2: 32000, 3: 0 },
  2: { 0: 22050, 1: 24000, 2: 16000, 3: 0 },
  0: { 0: 11025, 1: 12000, 2: 8000, 3: 0 },
} as const

function mp3Duration(buffer: Buffer): number | null {
  let offset = 0
  if (buffer.subarray(0, 3).toString('latin1') === 'ID3') {
    const size =
      ((buffer[6]! & 0x7f) << 21) | ((buffer[7]! & 0x7f) << 14) | ((buffer[8]! & 0x7f) << 7) | (buffer[9]! & 0x7f)
    offset = 10 + size
  }

  let totalSeconds = 0
  let frames = 0
  let guard = 0

  while (offset < buffer.length - 4 && guard < 60000) {
    guard += 1
    if (buffer[offset] !== 0xff || (buffer[offset + 1]! & 0xe0) !== 0xe0) {
      offset += 1
      continue
    }

    const header = buffer.readUInt32BE(offset)
    const versionBits = (header >>> 19) & 0x3
    const layerBits = (header >>> 17) & 0x3
    if (versionBits === 1 || layerBits === 0) {
      offset += 1
      continue
    }

    const version = versionBits === 3 ? 3 : versionBits === 2 ? 2 : 0
    const layer = 4 - layerBits
    const bitrateIndex = (header >>> 12) & 0xf
    const rateIndex = (header >>> 10) & 0x3
    const padding = (header >>> 9) & 0x1
    const channelMode = (header >>> 6) & 0x3

    const rateTable = SAMPLE_RATES[version as 0 | 2 | 3]
    const sampleRate = rateTable ? rateTable[rateIndex as 0 | 1 | 2 | 3] : 0
    if (!sampleRate || bitrateIndex === 0 || bitrateIndex === 15) {
      offset += 1
      continue
    }

    const table =
      version === 3
        ? layer === 1
          ? BITRATES_V1_L1
          : layer === 2
            ? BITRATES_V1_L2
            : BITRATES_V1_L3
        : layer === 1
          ? BITRATES_V2_L1
          : layer === 2
            ? BITRATES_V2_L2
            : BITRATES_V2_L3
    const bitrate = table[bitrateIndex]! * 1000
    if (!bitrate) {
      offset += 1
      continue
    }

    const samplesPerFrame = layer === 1 ? 384 : version === 3 ? (channelMode === 3 ? 576 : 1152) : 576
    const frameSize = Math.floor(((samplesPerFrame / 8) * bitrate) / sampleRate) + padding
    if (frameSize <= 4) {
      offset += 1
      continue
    }

    totalSeconds += samplesPerFrame / sampleRate
    frames += 1
    offset += frameSize
    if (totalSeconds > 60 * 60 * 6) break
  }

  if (frames === 0) return null
  return Math.round(totalSeconds * 100) / 100
}