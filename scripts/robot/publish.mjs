// The only script that writes a page.
//
// It writes no prose. Every string that reaches a reader is either copied
// verbatim from the outlet and shown in quotation marks with the outlet named,
// or built from a fixed template holding nothing but a date, an outlet name and
// a count. There is no sentence in this file that a fact could be smuggled into.
//
// Eight guards, checked in order. Each one prints why it fired.
//
// Run: node scripts/robot/publish.mjs
// Writes: src/content/updates/<YYYY-MM-DD>.md, data/robot/published.json

import fs from 'node:fs/promises'
import path from 'node:path'
import { ALLOWED_HOSTS } from './sources.mjs'
import { PUBLISHED_FILE, RAW_DIR, ROOT, readJson, today, writeJson } from './lib.mjs'

const UPDATES_DIR = path.join(ROOT, 'src', 'content', 'updates')
const EM_DASH = String.fromCharCode(8212)
const MIN_ITEMS_PER_DAY = 2
// Unlimited. One page per day is still the natural unit, so a run writes as
// many days as it has evidence for and no more.
const MAX_PAGES_PER_RUN = Number.POSITIVE_INFINITY
const DESC_MIN = 70
const DESC_MAX = 160

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function humanDay(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function joinList(names) {
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// A fixed template. The only variable parts are a date, a count and the names
// of the outlets. It tries the longest form first and shortens until one lands
// inside the length the collection schema demands.
function buildDescription(day, count, outlets) {
  const when = humanDay(day)
  const candidates = []
  for (let keep = outlets.length; keep >= 1; keep -= 1) {
    const who = joinList(outlets.slice(0, keep))
    candidates.push(
      `A record of what ${who} published about Grand Theft Auto VI on ${when}. ${count} items, each one quoted and linked to its source.`,
      `A record of what ${who} published about Grand Theft Auto VI on ${when}. ${count} items, quoted and linked.`,
      `What ${who} published about Grand Theft Auto VI on ${when}. ${count} items, quoted and linked to the source.`,
      `What ${who} published about Grand Theft Auto VI on ${when}. ${count} items, quoted and linked.`,
    )
  }
  return candidates.find((line) => line.length >= DESC_MIN && line.length <= DESC_MAX) ?? null
}

// YAML double quoted scalars accept JSON string escaping, so this is exact for
// any headline an outlet can produce, quotation marks and backslashes included.
const yaml = (value) => JSON.stringify(String(value))

async function loadRaw() {
  let names = []
  try {
    names = await fs.readdir(RAW_DIR)
  } catch {
    return []
  }
  const records = []
  for (const name of names.filter((file) => file.endsWith('.json')).sort()) {
    const file = path.join(RAW_DIR, name)
    const record = await readJson(file, null)
    if (record?.id) records.push({ ...record, file })
  }
  return records
}

const published = await readJson(PUBLISHED_FILE, { days: [], items: [] })
const usedItems = new Set(published.items ?? [])
const usedDays = new Set(published.days ?? [])

const raw = await loadRaw()
console.log(`publish: ${raw.length} raw items on disk, ${usedItems.size} already used`)

// ---- Guards 1 to 3, per item ------------------------------------------------

const kept = []

for (const record of raw) {
  if (usedItems.has(record.id)) continue

  // 1. Every field a page needs must be there. No blanks, no invented dates.
  if (!record.url || !record.title || !record.outlet || !ISO_DAY.test(record.published ?? '')) {
    console.log(`  drop ${record.id}: missing url, title, outlet or a valid published date`)
    continue
  }

  // 2. The link must point at a source this site actually watches.
  let host = null
  try {
    host = new URL(record.url).host
  } catch {
    host = null
  }
  if (!host || !ALLOWED_HOSTS.has(host)) {
    console.log(`  drop ${record.id}: host ${host ?? 'unreadable'} is not on the source list`)
    continue
  }

  // 3. A page may only be built from text still saved on disk. If the raw file
  //    is gone, the quote can no longer be checked, so it cannot be published.
  try {
    await fs.access(record.file)
  } catch {
    console.log(`  drop ${record.id}: raw file is gone`)
    continue
  }

  // 3b. No em dashes anywhere on this site, including inside a quotation.
  //     The quote cannot be trimmed, because then it would no longer be the
  //     outlet's exact words, so the item is dropped and the day keeps going.
  if (`${record.title}${record.summary ?? ''}`.includes(EM_DASH)) {
    console.log(`  drop ${record.id}: an em dash appears in the quoted text`)
    continue
  }

  kept.push(record)
}

// ---- Guards 4 to 8, per day -------------------------------------------------

const byDay = new Map()
for (const record of kept) {
  if (!byDay.has(record.published)) byDay.set(record.published, [])
  byDay.get(record.published).push(record)
}

const days = [...byDay.keys()].sort().reverse()
await fs.mkdir(UPDATES_DIR, { recursive: true })

let written = 0
const writtenDays = []
const writtenItems = []

for (const day of days) {
  if (written >= MAX_PAGES_PER_RUN) {
    console.log(`  stop: ${MAX_PAGES_PER_RUN} page per run, ${days.length - written} day(s) left for the next run`)
    break
  }

  const items = byDay.get(day).sort((a, b) => a.outlet.localeCompare(b.outlet) || a.title.localeCompare(b.title))

  // 4. One stray article is not a day of news.
  if (items.length < MIN_ITEMS_PER_DAY) {
    console.log(`  skip ${day}: only ${items.length} item, a day needs at least ${MIN_ITEMS_PER_DAY}`)
    continue
  }

  // 5. The robot never overwrites a page.
  const file = path.join(UPDATES_DIR, `${day}.md`)
  let exists = usedDays.has(day)
  if (!exists) {
    try {
      await fs.access(file)
      exists = true
    } catch {
      exists = false
    }
  }
  if (exists) {
    console.log(`  skip ${day}: a page for that day already exists`)
    continue
  }

  // 7. The description is templated, so it either fits or the day waits.
  const outlets = [...new Set(items.map((item) => item.outlet))]
  const description = buildDescription(day, items.length, outlets)
  if (!description) {
    console.log(`  skip ${day}: no templated description lands between ${DESC_MIN} and ${DESC_MAX} characters`)
    continue
  }

  const lines = [
    '---',
    `title: ${yaml(`GTA 6 coverage on ${humanDay(day)}`)}`,
    `description: ${yaml(description)}`,
    `date: ${yaml(day)}`,
    `updated: ${yaml(today())}`,
    'items:',
  ]
  for (const item of items) {
    lines.push(`  - outlet: ${yaml(item.outlet)}`)
    lines.push(`    headline: ${yaml(item.title)}`)
    if (item.summary) lines.push(`    summary: ${yaml(item.summary)}`)
    lines.push(`    url: ${yaml(item.url)}`)
    lines.push(`    published: ${yaml(item.published)}`)
  }
  lines.push('---', '')

  const text = lines.join('\n')

  // 8. Last net: guard 3b already dropped items with an em dash, so this only
  //    fires if one slipped in through some other field.
  if (text.includes(EM_DASH)) {
    console.log(`  skip ${day}: an em dash appears in the quoted text`)
    continue
  }

  await fs.writeFile(file, text, 'utf8')
  written += 1
  writtenDays.push(day)
  writtenItems.push(...items.map((item) => item.id))
  console.log(`  wrote src/content/updates/${day}.md with ${items.length} items from ${joinList(outlets)}`)
}

if (written) {
  await writeJson(PUBLISHED_FILE, {
    days: [...new Set([...usedDays, ...writtenDays])].sort(),
    items: [...new Set([...usedItems, ...writtenItems])].sort(),
  })
}

console.log('')
console.log(`publish: ${kept.length} items survived the item guards across ${days.length} day(s)`)
console.log(`publish: ${written} page written this run`)
