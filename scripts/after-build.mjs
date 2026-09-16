// Runs after astro build. Two guards, both learned the hard way on manhwaindex.
//   Lesson 7: assert asset sizes here, not at deploy time.
//   Lesson 8: print timings, so a silent hang is visible.

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')

// Cloudflare Pages refuses any single asset over 25 MB. Warn well before that.
const MAX_ASSET_BYTES = 20 * 1024 * 1024
const WARN_ASSET_BYTES = 10 * 1024 * 1024

const started = Date.now()
const elapsed = () => `+${((Date.now() - started) / 1000).toFixed(1)}s`

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(DIST)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0)

console.log(`[after-build] ${files.length} files, ${htmlFiles.length} html pages (${elapsed()})`)
console.log(`[after-build] total size ${(totalBytes / 1024 / 1024).toFixed(2)} MB`)

const oversized = []
const large = []

for (const file of files) {
  const bytes = statSync(file).size
  if (bytes > MAX_ASSET_BYTES) oversized.push([relative(DIST, file), bytes])
  else if (bytes > WARN_ASSET_BYTES) large.push([relative(DIST, file), bytes])
}

for (const [name, bytes] of large) {
  console.log(`[after-build] large asset: ${name} ${(bytes / 1024 / 1024).toFixed(1)} MB`)
}

if (oversized.length) {
  for (const [name, bytes] of oversized) {
    console.error(`[after-build] TOO BIG: ${name} ${(bytes / 1024 / 1024).toFixed(1)} MB`)
  }
  console.error('[after-build] Cloudflare Pages rejects any single asset over 25 MB.')
  process.exit(1)
}

// Cloudflare Pages also caps a project at 20,000 files. We build ~130 pages,
// so this should never fire. It fires silently one day if we forget it.
if (files.length > 15000) {
  console.error(`[after-build] TOO MANY FILES: ${files.length}. Cloudflare caps at 20,000.`)
  process.exit(1)
}

if (htmlFiles.length === 0) {
  console.error('[after-build] no HTML pages were built. Something is wrong.')
  process.exit(1)
}

// ads.txt, written only when there is a real publisher ID to put in it.
// Google reads an empty or placeholder ads.txt as "this site has no authorised
// sellers" and stops serving ads, which is worse than having no file at all.
// So the file appears the moment ADSENSE_CLIENT is filled in, and not before.
const { ADSENSE_CLIENT } = await import('../src/lib/site.mjs')
if (ADSENSE_CLIENT) {
  const publisher = ADSENSE_CLIENT.replace(/^ca-/, '')
  writeFileSync(
    join(DIST, 'ads.txt'),
    `google.com, ${publisher}, DIRECT, f08c47fec0942fa0
`,
    'utf8',
  )
  console.log(`[after-build] wrote ads.txt for ${publisher}`)
} else {
  console.log('[after-build] no ADSENSE_CLIENT set, so no ads.txt was written')
}

console.log(`[after-build] checks passed (${elapsed()})`)
