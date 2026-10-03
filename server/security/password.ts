import crypto from 'node:crypto'

/**
 * Password hashing primitives, deliberately free of any config/database import so
 * that `scripts/hash-password.ts` can run before the first admin credential exists.
 */

const KEY_LENGTH = 64
const SALT_BYTES = 16

/** Creates a `salt:hash` scrypt digest that can be stored in ADMIN_PASSWORD_HASH. */
export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

/** Constant-time comparison of a plain password against a `salt:hash` digest. */
export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== KEY_LENGTH) return false
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH)
  return crypto.timingSafeEqual(derived, expected)
}

/** Constant-time comparison for plaintext development credentials. */
export function verifyPlainPassword(password: string, expected: string): boolean {
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}