import { createPasswordHash } from '../server/security/password.ts'

const password = process.argv[2] ?? process.env.ADMIN_PASSWORD

if (!password || password.length < 8) {
  console.error('Usage: npm run hash -- <password>   (minimum 8 characters)')
  process.exit(1)
}

console.log(createPasswordHash(password))