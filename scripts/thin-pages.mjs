/**
 * Lists built pages whose main content is under a word threshold.
 *
 * Thin pages are the most common reason an ad network refuses a games site,
 * so this runs over dist/ after a build and prints every page that is short.
 *
 *   node scripts/thin-pages.mjs [threshold]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const LIMIT = Number(process.argv[2] || 300)

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.html')) out.push(path)
  }
  return out
}

function words(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  const body = main ? main[1] : html
  const text = body
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
  return text.split(/\s+/).filter(Boolean).length
}

const pages = walk(DIST).map((path) => ({
  url: '/' + relative(DIST, path).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, ''),
  count: words(readFileSync(path, 'utf8')),
}))

const thin = pages.filter((page) => page.count < LIMIT).sort((a, b) => a.count - b.count)

for (const page of thin) console.log(String(page.count).padStart(5), page.url)
console.log(`\n${thin.length} of ${pages.length} pages under ${LIMIT} words`)
