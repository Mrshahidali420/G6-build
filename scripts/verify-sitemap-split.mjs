// One-off verification for the sitemap split. Not part of the build.
// Run with: node scripts/verify-sitemap-split.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const distDir = fileURLToPath(new URL('../dist', import.meta.url))

const files = readdirSync(distDir)
  .filter((f) => /^sitemap.*\.xml$/.test(f))
  .sort()

console.log('Files matching dist/sitemap*.xml:')
for (const f of files) console.log(`  ${f}`)

const subSitemaps = files.filter((f) => f !== 'sitemap-index.xml')

const urlsByFile = {}
let allUrls = []
for (const f of subSitemaps) {
  const xml = readFileSync(path.join(distDir, f), 'utf8')
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  urlsByFile[f] = urls
  allUrls = allUrls.concat(urls)
}

console.log('\nURL count per sub-sitemap:')
for (const f of subSitemaps) console.log(`  ${f}: ${urlsByFile[f].length}`)

console.log(`\nTotal across sub-sitemaps: ${allUrls.length}`)

const dupeCounts = new Map()
for (const u of allUrls) dupeCounts.set(u, (dupeCounts.get(u) || 0) + 1)
const dupes = [...dupeCounts.entries()].filter(([, c]) => c > 1)
console.log(`Duplicate URLs across all sub-sitemaps: ${dupes.length}`)
if (dupes.length) {
  for (const [u, c] of dupes) console.log(`  DUPLICATE (${c}x): ${u}`)
}

const indexXml = readFileSync(path.join(distDir, 'sitemap-index.xml'), 'utf8')
const indexedFiles = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => m[1].split('/').pop(),
)

const missingFromIndex = subSitemaps.filter((f) => !indexedFiles.includes(f))
const indexedButAbsent = indexedFiles.filter((f) => !subSitemaps.includes(f))

console.log(`\nsitemap-index.xml lists ${indexedFiles.length} files:`)
for (const f of indexedFiles) console.log(`  ${f}`)

console.log(`\nSub-sitemaps missing from the index: ${missingFromIndex.length}`)
if (missingFromIndex.length) console.log(missingFromIndex)

console.log(`Index entries with no matching file on disk: ${indexedButAbsent.length}`)
if (indexedButAbsent.length) console.log(indexedButAbsent)

const ok =
  dupes.length === 0 && missingFromIndex.length === 0 && indexedButAbsent.length === 0
console.log(`\n${ok ? 'PASS' : 'FAIL'}`)
