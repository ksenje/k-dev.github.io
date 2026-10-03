import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

/**
 * GitHub Pages serves static files only: there is no rewrite rule for client-side
 * routing, so 404.html is a copy of index.html. The site has a single route, so any
 * unknown path renders the same page instead of a 404.
 */
await copyFile(resolve(dist, 'index.html'), resolve(dist, '404.html'))

/** Social crawlers need absolute URLs; the site address is only known at deploy time. */
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

/** Files referenced from markup, rewritten to absolute URLs. */
const MARKUP_FILES = [
  ['./og.svg', '/og.svg'],
  ['./og.png', '/og.png'],
  ['./favicon.svg', '/favicon.svg'],
  ['./apple-touch-icon.png', '/apple-touch-icon.png'],
]

if (siteUrl) {
  const pin = (html) => {
    let out = html
    for (const [from, to] of MARKUP_FILES) out = out.replaceAll(from, `${siteUrl}${to}`)
    return out
  }

  const index = resolve(dist, 'index.html')
  await writeFile(index, pin(await readFile(index, 'utf8')))

  // 404.html is served for arbitrary deep paths, where "./assets/..." would resolve
  // against the requested directory instead of the site root. Pin it to the site URL.
  const notFound = resolve(dist, '404.html')
  const fallback = pin(await readFile(notFound, 'utf8')).replaceAll('./assets/', `${siteUrl}/assets/`)
  await writeFile(notFound, fallback)

  // The bundle references its own hashed assets, so deep paths need the same pinning.
  const assets = resolve(dist, 'assets')
  const files = await readdir(assets)
  await Promise.all(
    files
      .filter((name) => name.endsWith('.js'))
      .map(async (name) => {
        const file = resolve(assets, name)
        const code = await readFile(file, 'utf8')
        if (!code.includes('"./assets/') && !code.includes('`./assets/')) return
        await writeFile(file, code.replaceAll('./assets/', `${siteUrl}/assets/`))
      }),
  )
}

console.log('postbuild: 404.html ready')