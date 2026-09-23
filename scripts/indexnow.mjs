// After a successful Cloudflare upload, tell IndexNow which pages changed.
// Only new/changed URLs are submitted, never the whole site on every deploy.
//
// Run with: node scripts/indexnow.mjs [--manifest <path>] [--dry-run]
//   --manifest  path to the JSON manifest (url -> content hash). Defaults to
//               MANIFEST_PATH env var, then .indexnow-manifest.json in the repo root.
//   --dry-run   compute and print counts, do not POST (the manifest is still
//               written, so running this twice in a row shows "all" then "0 changed").
//
// Never fails the deploy: network errors are logged and the script exits 0.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = path.join(ROOT, 'dist')

const HOST = 'gta6record.com'
const KEY = '9ce5adc7d2b0607db3a4e84d14e85185'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const CHUNK_SIZE = 10000

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const manifestFlagIndex = args.indexOf('--manifest')
const manifestPath =
  manifestFlagIndex !== -1 && args[manifestFlagIndex + 1]
    ? path.resolve(args[manifestFlagIndex + 1])
    : process.env.MANIFEST_PATH
      ? path.resolve(process.env.MANIFEST_PATH)
      : path.join(ROOT, '.indexnow-manifest.json')

function urlToDistFile(url) {
  const u = new URL(url)
  const pathname = u.pathname === '/' ? '/index' : u.pathname.replace(/\/$/, '')
  return path.join(DIST, `${pathname}.html`)
}

// Strip per-build noise so an unchanged page hashes the same across deploys:
//   - hashed /_astro/*.css|js references (shared bundles rehash even when a
//     page's own content did not change)
//   - <script>/<link> tags entirely, same reason plus third-party script URLs
// Then hash only the <main id="main">...</main> content, which is where each
// page's unique body lives. Falls back to the stripped full document if a
// page has no <main> (should not happen on this site, but never fail hard).
function stableHash(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<link\b[^>]*>/g, '')
  const mainMatch = stripped.match(/<main\b[^>]*>[\s\S]*<\/main>/)
  const toHash = mainMatch ? mainMatch[0] : stripped
  return createHash('sha256').update(toHash).digest('hex')
}

function loadManifest() {
  if (!existsSync(manifestPath)) return null
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (err) {
    console.warn(`[indexnow] could not parse existing manifest, treating as first run: ${err.message}`)
    return null
  }
}

async function submit(urlList) {
  if (dryRun) {
    console.log(`[indexnow] dry-run: would submit ${urlList.length} url(s)`)
    return
  }
  const chunks = []
  for (let i = 0; i < urlList.length; i += CHUNK_SIZE) {
    chunks.push(urlList.slice(i, i + CHUNK_SIZE))
  }
  for (const chunk of chunks) {
    const body = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: chunk,
    })
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
      })
      console.log(`[indexnow] submitted ${chunk.length} url(s), HTTP ${res.status}`)
    } catch (err) {
      console.warn(`[indexnow] network error, skipping this deploy's notification: ${err.message}`)
    }
  }
}

async function main() {
  const sitemapFiles = readdirSync(DIST).filter(
    (f) => /^sitemap-.*\.xml$/.test(f) && f !== 'sitemap-index.xml',
  )
  const sitemapUrls = new Set()
  for (const file of sitemapFiles) {
    const xml = readFileSync(path.join(DIST, file), 'utf8')
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(m[1])
  }
  const urls = [...sitemapUrls].sort()

  console.log(`[indexnow] ${urls.length} url(s) across ${sitemapFiles.length} sitemap file(s)`)

  const previousManifest = loadManifest()
  const isFirstRun = previousManifest === null
  const newManifest = {}
  const changed = []

  for (const url of urls) {
    const distFile = urlToDistFile(url)
    let hash
    try {
      const html = readFileSync(distFile, 'utf8')
      hash = stableHash(html)
    } catch (err) {
      console.warn(`[indexnow] could not read built file for ${url} (${distFile}): ${err.message}`)
      continue
    }
    newManifest[url] = hash
    if (isFirstRun || previousManifest[url] !== hash) changed.push(url)
  }

  console.log(
    isFirstRun
      ? `[indexnow] no previous manifest found, submitting all ${changed.length} url(s)`
      : `[indexnow] ${changed.length} url(s) changed since the last deploy`,
  )

  if (changed.length > 0) await submit(changed)
  else console.log('[indexnow] nothing changed, skipping the request')

  // The manifest is written even on --dry-run: dry-run only skips the POST,
  // so running it twice in a row is a valid way to check the "0 changed"
  // case without hitting the network.
  writeFileSync(manifestPath, JSON.stringify(newManifest, null, 0), 'utf8')
  console.log(`[indexnow] wrote manifest (${Object.keys(newManifest).length} url(s)) to ${manifestPath}`)
}

main().catch((err) => {
  console.warn(`[indexnow] unexpected error, not failing the deploy: ${err.message}`)
  process.exit(0)
})
