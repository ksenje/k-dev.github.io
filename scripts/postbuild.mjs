import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

/** Social crawlers need absolute URLs; the site address is only known at deploy time. */
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

/** Files referenced from markup, rewritten to absolute URLs. */
const MARKUP_FILES = [
  ['./og.png', '/og.png'],
  ['./favicon.png', '/favicon.png'],
  ['./apple-touch-icon.png', '/apple-touch-icon.png'],
]

/**
 * The site is a single route with hash links, so every unknown path — including the
 * old repository path — is redirected to the one canonical address at the root.
 */
const target = siteUrl ? `${siteUrl}/` : '/'
const notFound = [
  '<!doctype html>',
  '<html lang="ru">',
  '<head>',
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />',
  '<title>ксенже</title>',
  `<link rel="canonical" href="${target}" />`,
  `<meta http-equiv="refresh" content="0; url=${target}" />`,
  `<script>location.replace(${JSON.stringify(target)} + location.hash)</script>`,
  '</head>',
  `<body>Переход на <a href="${target}">главную</a>…</body>`,
  '</html>',
  '',
].join('\n')
await writeFile(resolve(dist, '404.html'), notFound)

if (siteUrl) {
  const index = resolve(dist, 'index.html')
  let html = await readFile(index, 'utf8')
  for (const [from, to] of MARKUP_FILES) html = html.replaceAll(from, `${siteUrl}${to}`)
  await writeFile(index, html)

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

console.log('postbuild: icons pinned, 404 redirect ready')
