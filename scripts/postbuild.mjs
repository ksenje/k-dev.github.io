import { copyFile, readFile, writeFile } from 'node:fs/promises'
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

/** Social crawlers need an absolute og:image; the repo name is only known at deploy time. */
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')

if (siteUrl) {
  const index = resolve(dist, 'index.html')
  const html = await readFile(index, 'utf8')
  await writeFile(index, html.replaceAll('./og.svg', `${siteUrl}/og.svg`))

  // 404.html is served for arbitrary deep paths, where "./assets/..." would resolve
  // against the requested directory instead of the site root. Pin it to the site URL.
  const notFound = resolve(dist, '404.html')
  const fallback = await readFile(notFound, 'utf8')
  await writeFile(
    notFound,
    fallback
      .replaceAll('./og.svg', `${siteUrl}/og.svg`)
      .replaceAll('./assets/', `${siteUrl}/assets/`)
      .replaceAll('./favicon.svg', `${siteUrl}/favicon.svg`),
  )
}

console.log('postbuild: 404.html ready')