/**
 * Finds the things this site has a page about inside a block of claim text.
 *
 * The rules started in scripts/import/tracker.mjs, the one-off import that
 * built the record out of the AaronShenny/gta6-news archive. They live here
 * now because the ongoing fetcher, scripts/fetch-claims.mjs, has to match a
 * name exactly the way that import did. If the two drifted apart, a claim
 * logged tomorrow would link differently from an identical claim logged last
 * March, and the record would stop being one record.
 *
 * The import itself still carries its own copy. It has already run and its
 * output is committed, so it is history and is left alone. Any change to the
 * rules belongs here, and then the import is re-run if the whole record is
 * ever rebuilt.
 *
 * The rules are all about not making a wrong link. A wrong link is worse than
 * a missing one, because a reader who follows it stops trusting the next one.
 */
import { readFileSync, existsSync } from 'node:fs'

/** entityType to the hub folder its page sits in. */
export const HUB_OF = {
  character: 'characters',
  vehicle: 'vehicles',
  location: 'locations',
  song: 'soundtrack',
  business: 'businesses',
  brand: 'brands',
  landmark: 'landmarks',
  weapon: 'weapons',
  gameplay_feature: 'gameplay',
  edition: 'editions',
  wildlife: 'wildlife',
}

/**
 * Names too common to match on. Every one of these is a real entity name on
 * this site and also an ordinary English word, or a word that appears in
 * almost every GTA 6 sentence ever written. Matching them would link every
 * page to the same four pages and mean nothing.
 */
const TOO_COMMON = new Set([
  'gta 6', 'gta vi', 'grand theft auto', 'grand theft auto vi', 'grand theft auto 6',
  'rockstar', 'rockstar games', 'the game', 'trailer', 'trailer 1', 'trailer 2',
  'map', 'money', 'cash', 'radio', 'police', 'car', 'cars', 'gun', 'guns',
  'phone', 'boat', 'plane', 'bike', 'news', 'update', 'story', 'mission',
  'missions', 'online', 'player', 'players', 'world', 'city', 'state', 'beach',
])

/**
 * One word entity names that are also ordinary English words. "Rockstar has no
 * limit" is not a mention of the shop called Limit. These only ever match as
 * part of a longer name.
 */
const ORDINARY_WORDS = new Set([
  'alpha', 'beast', 'bison', 'brute', 'capo', 'cats', 'crest', 'dogs', 'ducks',
  'eels', 'fish', 'foxes', 'fruit', 'halt', 'keys', 'knife', 'limit', 'mesa',
  'mule', 'obey', 'primo', 'rebel', 'shark', 'sumo', 'swift', 'thaw', 'want',
  'kayak', 'dodo', 'ingot', 'tulip', 'sugoi', 'toros', 'verus', 'gainz',
  'blick', 'eris', 'hawx', 'hobo', 'chino', 'biff', 'capri', 'futo', 'novak',
  'furia', 'youga', 'zesta', 'xero', 'phix', 'sera', 'artek', 'annis', 'canis',
  'enus', 'karin', 'dinka', 'vapid', 'ecola', 'metv', 'neds', 'oilio',
])

/**
 * Every name this site has a page for, longest first so "Vice City Beach"
 * wins over "Vice City" when both sit in the same sentence.
 */
export function buildEntityIndex(entitiesPath) {
  if (!existsSync(entitiesPath)) {
    console.error(`[claims] ${entitiesPath} is missing. Run npm run data first.`)
    process.exit(1)
  }
  const seen = new Map()
  for (const entity of JSON.parse(readFileSync(entitiesPath, 'utf8'))) {
    const hub = HUB_OF[entity.entityType]
    if (!hub) continue
    for (const name of [entity.name, ...(entity.altNames || [])]) {
      const clean = String(name || '').trim()
      const key = clean.toLowerCase()
      const words = clean.split(/\s+/).length
      if (!clean || TOO_COMMON.has(key)) continue
      // A one word name has to earn its match. Four letters or more, and not
      // an ordinary English word. That keeps Lucia, Jason, Duval and Wyman,
      // which are the names most of the talk is about, and throws out Shark,
      // Limit and Want, which are not names in a sentence.
      if (words === 1 && (clean.length < 4 || ORDINARY_WORDS.has(key))) continue
      if (seen.has(key)) continue
      seen.set(key, { slug: entity.slug, name: entity.name, hub, type: entity.entityType })
    }
  }
  return [...seen.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.key.length - a.key.length)
}

/**
 * Every entity named anywhere in a claim, as page slugs, most specific first.
 * Matching is whole word only, so "Panther" does not match "Panthers Ridge".
 */
export function entitiesIn(index, text, limit = 8) {
  const haystack = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  const hits = []
  const taken = new Set()
  for (const entity of index) {
    if (taken.has(entity.slug)) continue
    const needle = ` ${entity.key.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
    if (!haystack.includes(needle)) continue
    taken.add(entity.slug)
    hits.push(entity.slug)
    if (hits.length >= limit) break
  }
  return hits
}

/**
 * Where a claim came from, as a label a reader understands rather than a
 * hostname. The fetcher watches four feeds, so all four kinds are here.
 */
export function sourceOf(url) {
  const host = (String(url || '').match(/^https?:\/\/([^/]+)/) || [])[1] || ''
  if (/reddit\.com$/.test(host)) {
    const sub = (url.match(/reddit\.com\/r\/([A-Za-z0-9_]+)/) || [])[1]
    return { kind: 'reddit', label: sub ? `r/${sub}, Reddit` : 'Reddit' }
  }
  if (/gamespot\.com$/.test(host)) return { kind: 'press', label: 'GameSpot' }
  if (/ign\.com$/.test(host)) return { kind: 'press', label: 'IGN' }
  if (/rockstargames\.com$/.test(host)) return { kind: 'official', label: 'Rockstar Newswire' }
  return { kind: 'other', label: host.replace(/^www\./, '') || 'Unknown source' }
}

/** YAML-safe double quoted scalar. */
export const yaml = (value) =>
  `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()}"`

/** Tags worth keeping as topics. The boilerplate ones say nothing. */
const DULL_TAGS = new Set([
  'gta 6', 'gta vi', 'gta6', 'grand theft auto', 'grand theft auto 6',
  'grand theft auto vi', 'gaming news', 'gaming', 'video games', 'news',
  'rockstar games', 'rockstar', 'video game', 'games',
])

export function topicsOf(tags) {
  const out = []
  for (const tag of tags || []) {
    const clean = String(tag).trim()
    if (!clean || DULL_TAGS.has(clean.toLowerCase())) continue
    if (clean.length > 34) continue
    if (!out.some((kept) => kept.toLowerCase() === clean.toLowerCase())) out.push(clean)
    if (out.length >= 6) break
  }
  return out
}

/**
 * A description that fits a search result and the collection schema, which
 * wants 40 to 200 characters.
 */
export function describe(meta, title, summary) {
  const pick = (meta || '').trim() || summary
  const text = String(pick).replace(/\s+/g, ' ').trim()
  if (text.length >= 70 && text.length <= 160) return text
  if (text.length > 160) {
    const cut = text.slice(0, 157)
    const at = cut.lastIndexOf(' ')
    return `${cut.slice(0, at > 90 ? at : 157).replace(/[,;:.]$/, '')}...`
  }
  const padded = `${text} ${title}`.replace(/\s+/g, ' ').trim()
  return padded.length > 160 ? `${padded.slice(0, 157)}...` : padded
}

/** The markdown file for one claim. The body is always empty on purpose. */
export function claimFile(item) {
  const lines = [
    '---',
    `title: ${yaml(item.title)}`,
    `description: ${yaml(item.description)}`,
    `date: ${yaml(item.date)}`,
    `status: ${yaml(item.status)}`,
    'source:',
    `  label: ${yaml(item.source.label)}`,
    `  url: ${yaml(item.source.url)}`,
    `  kind: ${yaml(item.source.kind)}`,
    `summary: ${yaml(item.summary)}`,
    'points:',
    ...item.points.map((point) => `  - ${yaml(point)}`),
  ]
  if (item.faq?.length) {
    lines.push('faq:')
    for (const entry of item.faq) lines.push(`  - q: ${yaml(entry.q)}`, `    a: ${yaml(entry.a)}`)
  }
  if (item.topics?.length) {
    lines.push('topics:')
    for (const topic of item.topics) lines.push(`  - ${yaml(topic)}`)
  }
  if (item.related?.length) {
    lines.push('related:')
    for (const slug of item.related) lines.push(`  - ${yaml(slug)}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

/** A title turned into a URL segment, capped so a URL stays readable. */
export function slugify(title) {
  let slug = String(title)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (slug.length > 72) {
    const cut = slug.slice(0, 72)
    const at = cut.lastIndexOf('-')
    slug = cut.slice(0, at > 40 ? at : 72)
  }
  return slug.replace(/^-|-$/g, '')
}
