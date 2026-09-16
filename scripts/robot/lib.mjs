// Shared machinery for both gathering lanes. The RSS lane and the Newswire
// lane write the same raw file through the same function, so there is exactly
// one place where a raw record is defined.
//
// Nothing in here writes a page. Nothing in here writes a sentence.

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DATA_DIR = path.join(ROOT, 'data', 'robot')
export const RAW_DIR = path.join(DATA_DIR, 'raw')
export const SEEN_FILE = path.join(DATA_DIR, 'seen.json')
export const PUBLISHED_FILE = path.join(DATA_DIR, 'published.json')

export const UA = 'gta6record-robot (+https://gta6record.com)'
export const PAGE_TIMEOUT_MS = 15000
export const TEXT_CAP = 20000
export const MAX_NEW_PER_RUN = 25

export function idFor(sourceId, url) {
  return `${sourceId}-${createHash('sha1').update(url).digest('hex').slice(0, 12)}`
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '...',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: '-',
  mdash: '-',
}

export function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
}

function dropControl(value) {
  let out = ''
  for (const ch of value) {
    const code = ch.codePointAt(0)
    out += code < 32 ? ' ' : ch
  }
  return out
}

export function stripCdata(value) {
  return value.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '')
}

// Feed titles and summaries arrive with markup in them. The robot quotes these
// strings verbatim on a page, so they have to be plain text before they are
// stored, not on the way out.
export function clean(value) {
  if (!value) return ''
  return dropControl(decodeEntities(stripCdata(value).replace(/<[^>]*>/g, ' ')))
    .replace(/\s+/g, ' ')
    .trim()
}

export function plainText(html) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' '),
  ).slice(0, TEXT_CAP)
}

export function isoDay(value) {
  if (!value) return null
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return null
  return when.toISOString().slice(0, 10)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function loadSeen() {
  const list = await readJson(SEEN_FILE, [])
  return new Set(Array.isArray(list) ? list : [])
}

export async function saveSeen(seen) {
  await writeJson(SEEN_FILE, [...seen].sort())
}

export async function getText(url, { timeout = PAGE_TIMEOUT_MS } = {}) {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.text()
}

// Attributes get parsed properly rather than matched with one regex. A first
// cut used content=["']([^"']*)["'] and quietly cut every headline short at the
// first apostrophe, which turned a verbatim quote into a misquote. On this site
// that is the worst bug there is, so the parser respects the opening quote.
const META_TAG = /<meta\b(?:"[^"]*"|'[^']*'|[^>])*>/gi
const META_ATTR = /([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g

function metaTags(html) {
  const tags = []
  for (const tag of html.match(META_TAG) ?? []) {
    const attrs = {}
    for (const attr of tag.matchAll(META_ATTR)) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? ''
    }
    tags.push(attrs)
  }
  return tags
}

function meta(tags, keys) {
  for (const key of keys) {
    for (const tag of tags) {
      const holder = (tag.property ?? tag.name ?? '').toLowerCase()
      if (holder !== key) continue
      const value = clean(tag.content ?? '')
      if (value) return value
    }
  }
  return ''
}

// Reads the article page for the outlet's own words. og:title and
// og:description are what the outlet chose to say about its own piece, which
// is exactly the kind of fact this site is allowed to record.
export function readArticle(html) {
  const tags = metaTags(html)
  return {
    ogTitle: meta(tags, ['og:title', 'twitter:title']),
    ogDescription: meta(tags, ['og:description', 'description', 'twitter:description']),
    published: meta(tags, ['article:published_time', 'article:published', 'datepublished']),
    text: plainText(html),
  }
}

// The one place a raw record is created. Both lanes call this.
// Returns the record, or null when the page could not be fetched.
export async function saveRaw({ source, url, title, summary = '', published = null }) {
  let page = null
  try {
    page = readArticle(await getText(url))
  } catch (error) {
    console.log(`  skipped, page did not load: ${url} (${error.message})`)
    return null
  }

  const record = {
    id: idFor(source.id, url),
    sourceId: source.id,
    outlet: source.outlet,
    tier: source.tier,
    url,
    title: clean(page.ogTitle || title),
    summary: clean(page.ogDescription || summary),
    published: isoDay(page.published) ?? isoDay(published),
    fetched: new Date().toISOString(),
    text: page.text,
  }

  await fs.mkdir(RAW_DIR, { recursive: true })
  await fs.writeFile(path.join(RAW_DIR, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  return record
}
