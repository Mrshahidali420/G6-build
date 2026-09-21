/**
 * Builds the claim tracker from the AaronShenny/gta6-news archive.
 *
 * That project watched four feeds for two years and wrote up every GTA 6 item
 * that crossed them: IGN, GameSpot, the Rockstar Newswire and the top of
 * r/GTA6. Each write-up carries one thing no other archive of GTA 6 talk has,
 * and it is the only reason this import exists: a status word. CONFIRMED,
 * RUMOR, LEAK or UNKNOWN, attached to the claim at the time it was made.
 *
 * That is a record. Most of what people believe about this game started as a
 * post on r/GTA6, got repeated, and lost its status on the way. A dated list
 * of claims with the status each one had is worth more than the claims.
 *
 * What this importer does NOT do is reprint the archive. The write-ups were
 * machine written, and a machine paragraph reprinted on a new domain is a
 * machine paragraph. So every fact is pulled out into typed frontmatter and
 * the body of each file is left empty. The page is then built by
 * src/pages/tracker/[slug].astro out of those fields: the claim, its status,
 * what the status means, the source it came from, the takeaways, the
 * questions, and links to the pages on this site the claim touches.
 *
 * That last part is the work. A rumour about Port Gellhorn is only useful
 * next to the Port Gellhorn page. Every claim is scanned for the 750 things
 * this site already has a page about, and the matches become links.
 *
 * The one paragraph of source prose that is kept is the summary, and it is
 * rendered under a heading that says whose summary it is. A summary of a
 * Reddit thread, labelled as one, is honest. The same words presented as our
 * reporting would not be.
 *
 * Leaks are kept. This is a record site, and a leak that was reported on is
 * part of the record. No leaked file, image or recreation is stored or linked
 * to: the text says what was claimed and the source link goes to the thread
 * that claimed it.
 *
 * The archive repo is not inside this repo, so the output is committed.
 * Cloudflare cannot rebuild it.
 *
 *   node scripts/import/tracker.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, '..', 'gta6-src', 'AaronShenny-gta6-news', 'frontend', 'content', 'posts')
const OUT = join(ROOT, 'src', 'content', 'tracker')

if (!existsSync(SRC)) {
  console.error(`[tracker] cannot find ${SRC}`)
  console.error('[tracker] the reference clone is expected at ../gta6-src/AaronShenny-gta6-news')
  process.exit(1)
}

/* ------------------------------------------------------------------ entities */

/** entityType to the hub folder its page sits in. */
const HUB_OF = {
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
 * this site and also an ordinary English word or a word that appears in almost
 * every GTA 6 sentence ever written, so matching them would link every page to
 * the same four pages and mean nothing.
 */
const TOO_COMMON = new Set([
  'gta 6', 'gta vi', 'grand theft auto', 'grand theft auto vi', 'grand theft auto 6',
  'rockstar', 'rockstar games', 'the game', 'trailer', 'trailer 1', 'trailer 2',
  'map', 'money', 'cash', 'radio', 'police', 'car', 'cars', 'gun', 'guns',
  'phone', 'boat', 'plane', 'bike', 'news', 'update', 'story', 'mission',
  'missions', 'online', 'player', 'players', 'world', 'city', 'state', 'beach',
])

/**
 * One word entity names that are also ordinary English words. Every one of
 * these is a real name on this site, and every one of them would match a
 * sentence that is not about it. "Rockstar has no limit" is not a mention of
 * the shop called Limit. A wrong link is worse than a missing one, so these
 * only ever match as part of a longer name.
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
 * Every name this site has a page for, longest first so "Vice City Beach" wins
 * over "Vice City" when both sit in the same sentence.
 */
function buildEntityIndex() {
  const path = join(ROOT, 'src', 'data', 'entities.json')
  if (!existsSync(path)) {
    console.error('[tracker] src/data/entities.json is missing. Run npm run data first.')
    process.exit(1)
  }
  const seen = new Map()
  for (const entity of JSON.parse(readFileSync(path, 'utf8'))) {
    const hub = HUB_OF[entity.entityType]
    if (!hub) continue
    for (const name of [entity.name, ...(entity.altNames || [])]) {
      const clean = String(name || '').trim()
      const key = clean.toLowerCase()
      // A one word name is only safe to match if it is long and distinctive.
      // "Lucia" is fine. "Jason" is fine. "Boat" is not a name, it is a noun.
      const words = clean.split(/\s+/).length
      if (!clean || TOO_COMMON.has(key)) continue
      // A one word name has to earn its match. It must be four letters or
      // more, and it must not be an ordinary English word. That keeps Lucia,
      // Jason, Duval and Wyman, which are the names the whole archive is
      // about, and throws out Shark, Limit and Want, which are not.
      if (words === 1 && (clean.length < 4 || ORDINARY_WORDS.has(key))) continue
      if (seen.has(key)) continue
      seen.set(key, { slug: entity.slug, name: entity.name, hub, type: entity.entityType })
    }
  }
  return [...seen.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.key.length - a.key.length)
}

const entityIndex = buildEntityIndex()

/** Regex-safe version of a name. */
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Every entity named anywhere in a claim, as page slugs, most specific first.
 * Matching is whole word only, so "Panther" does not match "Panthers Ridge".
 */
function entitiesIn(text) {
  const haystack = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  const hits = []
  const taken = new Set()
  for (const entity of entityIndex) {
    if (taken.has(entity.slug)) continue
    const needle = ` ${entity.key.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
    if (!haystack.includes(needle)) continue
    taken.add(entity.slug)
    hits.push(entity.slug)
    if (hits.length >= 8) break
  }
  return hits
}

/* -------------------------------------------------------------------- parse */

/** The four status words, and the source project's own spelling of each. */
const STATUS = new Set(['CONFIRMED', 'RUMOR', 'LEAK', 'UNKNOWN'])

/**
 * Where a claim came from, as a label a reader understands. The archive only
 * ever carried these two hosts, but the ongoing fetcher watches four feeds, so
 * the other two are here ready rather than added later.
 */
function sourceOf(url) {
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

/** The YAML value from a `key: "value"` line, quotes stripped. */
function field(text, key) {
  const hit = text.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  if (!hit) return ''
  return hit[1].trim().replace(/^"(.*)"$/s, '$1').replace(/\\"/g, '"').trim()
}

/** The `tags: ["a", "b"]` line as an array. */
function tagList(text) {
  const hit = text.match(/^tags:\s*\[(.*)\]\s*$/m)
  if (!hit) return []
  return hit[1]
    .split(/",\s*"/)
    .map((tag) => tag.replace(/^\s*"?|"?\s*$/g, '').trim())
    .filter(Boolean)
}

/**
 * The lead paragraph: everything between the "# Title" line and the first
 * "## " heading. It is the source project's summary of the item, and it is
 * carried across as a summary with that said on the page.
 */
function summaryOf(body) {
  const after = body.replace(/^#\s+.*$/m, '')
  const cut = after.indexOf('\n## ')
  const block = (cut < 0 ? after : after.slice(0, cut)).trim()
  return block.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).join(' ')
}

/** The "- " bullets under "## Key Takeaways". */
function pointsOf(body) {
  const block = (body.split(/^## Key Takeaways\s*$/m)[1] || '').split(/^## /m)[0]
  return block
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter((line) => line.length > 10)
}

/**
 * The bold question and plain answer pairs under "## FAQ". Some items have no
 * FAQ at all, and those return an empty list rather than a broken one.
 */
function faqOf(body) {
  const block = (body.split(/^## FAQ\s*$/m)[1] || '').split(/^## /m)[0]
  const out = []
  const re = /^\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n\[Read full article\]|$)/gm
  let hit
  while ((hit = re.exec(block)) !== null) {
    const question = hit[1].trim()
    const answer = hit[2].replace(/\[Read full article\][\s\S]*$/, '').trim().replace(/\s+/g, ' ')
    if (question.length > 8 && answer.length > 15) out.push({ q: question, a: answer })
  }
  return out.slice(0, 6)
}

/* --------------------------------------------------------------------- clean */

/** Tags worth keeping as topics. The boilerplate ones say nothing. */
const DULL_TAGS = new Set([
  'gta 6', 'gta vi', 'gta6', 'grand theft auto', 'grand theft auto 6',
  'grand theft auto vi', 'gaming news', 'gaming', 'video games', 'news',
  'rockstar games', 'rockstar', 'video game', 'games',
])

function topicsOf(tags) {
  const out = []
  for (const tag of tags) {
    const clean = tag.trim()
    if (!clean || DULL_TAGS.has(clean.toLowerCase())) continue
    if (clean.length > 34) continue
    if (!out.some((kept) => kept.toLowerCase() === clean.toLowerCase())) out.push(clean)
    if (out.length >= 6) break
  }
  return out
}

/**
 * A description that fits a search result and the collection schema, which
 * wants 70 to 160 characters. The source meta description is used when it
 * fits, and trimmed on a word boundary when it does not.
 */
function describe(meta, title, summary) {
  const pick = (meta || '').trim() || summary
  const text = pick.replace(/\s+/g, ' ').trim()
  if (text.length >= 70 && text.length <= 160) return text
  if (text.length > 160) {
    const cut = text.slice(0, 157)
    const at = cut.lastIndexOf(' ')
    return `${cut.slice(0, at > 90 ? at : 157).replace(/[,;:.]$/, '')}...`
  }
  // Too short. Pad with the title, which is always a full sentence of its own.
  const padded = `${text} ${title}`.replace(/\s+/g, ' ').trim()
  return padded.length > 160 ? `${padded.slice(0, 157)}...` : padded
}

/** YAML-safe double quoted scalar. */
const q = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ').trim()}"`

/* ---------------------------------------------------------------------- run */

const files = readdirSync(SRC).filter((name) => name.endsWith('.md')).sort()

const seenUrl = new Set()
const seenTitle = new Set()
const seenSlug = new Set()

const kept = []
const dropped = { status: 0, thin: 0, dupeUrl: 0, dupeTitle: 0, noSource: 0, noDate: 0 }

for (const file of files) {
  const raw = readFileSync(join(SRC, file), 'utf8')
  const head = (raw.match(/^---\n([\s\S]*?)\n---/) || [])[1] || ''
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '')

  const status = field(head, 'classification').toUpperCase()
  if (!STATUS.has(status)) { dropped.status += 1; continue }

  const stamp = field(head, 'date')
  const date = stamp.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { dropped.noDate += 1; continue }

  const url = field(head, 'source')
  if (!/^https?:\/\//.test(url)) { dropped.noSource += 1; continue }
  if (seenUrl.has(url)) { dropped.dupeUrl += 1; continue }

  const title = field(head, 'title')
  const titleKey = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (!titleKey) { dropped.thin += 1; continue }
  if (seenTitle.has(titleKey)) { dropped.dupeTitle += 1; continue }

  const summary = summaryOf(body)
  const points = pointsOf(body)
  const faq = faqOf(body)

  // The quality gate. A claim needs a real paragraph and at least three
  // takeaways, or there is nothing on the page a reader could not get from
  // the headline, and the page should not exist.
  if (summary.split(/\s+/).length < 30 || points.length < 3) { dropped.thin += 1; continue }

  seenUrl.add(url)
  seenTitle.add(titleKey)

  // The slug is the archive filename without its date prefix, capped so a URL
  // stays readable. A collision gets the date appended, which is always unique
  // because the title check above already ran.
  let slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
  if (slug.length > 72) {
    const cut = slug.slice(0, 72)
    slug = cut.slice(0, cut.lastIndexOf('-') > 40 ? cut.lastIndexOf('-') : 72)
  }
  slug = slug.replace(/^-|-$/g, '')
  if (seenSlug.has(slug)) slug = `${slug}-${date}`
  seenSlug.add(slug)

  const source = sourceOf(url)
  // Everything a claim says, in one string, for the entity scan. The tags are
  // in here because the archive tagged by subject, so a thread about Port
  // Gellhorn carries "Port Gellhorn" as a tag even when the write-up spells it
  // only once.
  const tags = tagList(head)
  const scanned = [
    title,
    summary,
    ...points,
    ...faq.map((item) => `${item.q} ${item.a}`),
    ...tags,
  ].join(' ')

  kept.push({
    slug,
    title,
    description: describe(field(head, 'description'), title, summary),
    date,
    status,
    source: { ...source, url },
    summary,
    points: points.slice(0, 8),
    faq,
    topics: topicsOf(tags),
    related: entitiesIn(scanned),
  })
}

/* -------------------------------------------------------------------- write */

// The whole folder is rebuilt every run. These files are generated, never
// hand edited, so a stale one left behind by a rename would be a silent bug.
if (existsSync(OUT)) rmSync(OUT, { recursive: true })
mkdirSync(OUT, { recursive: true })

for (const item of kept) {
  const lines = [
    '---',
    `title: ${q(item.title)}`,
    `description: ${q(item.description)}`,
    `date: ${q(item.date)}`,
    `status: ${q(item.status)}`,
    'source:',
    `  label: ${q(item.source.label)}`,
    `  url: ${q(item.source.url)}`,
    `  kind: ${q(item.source.kind)}`,
    `summary: ${q(item.summary)}`,
    'points:',
    ...item.points.map((point) => `  - ${q(point)}`),
  ]
  if (item.faq.length) {
    lines.push('faq:')
    for (const entry of item.faq) lines.push(`  - q: ${q(entry.q)}`, `    a: ${q(entry.a)}`)
  }
  if (item.topics.length) {
    lines.push('topics:')
    for (const topic of item.topics) lines.push(`  - ${q(topic)}`)
  }
  if (item.related.length) {
    lines.push('related:')
    for (const slug of item.related) lines.push(`  - ${q(slug)}`)
  }
  lines.push('---', '')
  writeFileSync(join(OUT, `${item.slug}.md`), lines.join('\n'))
}

/* ------------------------------------------------------------------- report */

const byStatus = {}
for (const item of kept) byStatus[item.status] = (byStatus[item.status] || 0) + 1
const linked = kept.filter((item) => item.related.length).length
const withFaq = kept.filter((item) => item.faq.length).length
const links = kept.reduce((sum, item) => sum + item.related.length, 0)
const months = new Set(kept.map((item) => item.date.slice(0, 7)))

console.log(`[tracker] ${files.length} archive files in, ${kept.length} claims kept`)
console.log(`[tracker] dropped: ${dropped.thin} too thin, ${dropped.dupeUrl} same source, ${dropped.dupeTitle} same title, ${dropped.status} no status, ${dropped.noSource} no source, ${dropped.noDate} no date`)
for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`[tracker]   ${status}: ${count}`)
}
console.log(`[tracker] ${withFaq} carry a FAQ, ${linked} link to a page here, ${links} links total`)
console.log(`[tracker] ${months.size} months, ${[...months].sort()[0]} to ${[...months].sort().pop()}`)
console.log(`[tracker] wrote ${kept.length} files to src/content/tracker/`)
