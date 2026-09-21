/**
 * Matches places in the game to the real Florida places they are built from.
 *
 * Vice City is Miami. That is the whole premise of the setting, and the
 * community has spent years standing in front of the real buildings and
 * working out which one is which. A hotel on Ocean Drive in the game is a
 * specific hotel on Ocean Drive in Miami Beach.
 *
 * That work lives in the GTADB community map, and the navanem/gta6-leonida-atlas
 * project pinned a revision of it. Each record holds the in-game address, the
 * real-world address, and how sure the mapper is about both.
 *
 * Only the solid half is kept here. A record must have a real in-game name,
 * not a question mark, and a real-world address. That leaves the rows a reader
 * can actually check by opening a map of Miami.
 *
 * What this is not: proof of anything Rockstar has said. Rockstar has never
 * published a single one of these pairings. The atlas project puts it well in
 * its own methodology, and this page keeps the same order: Rockstar media
 * first, community reconstruction second, Florida analogues third and never as
 * game truth.
 *
 * The source repo is not inside this repo, so the output file is committed.
 * Cloudflare cannot rebuild it.
 *
 *   node scripts/import/real-places.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(
  ROOT, '..', 'gta6-src', 'navanem-gta6-leonida-atlas',
  'public', 'assets', 'street-leonida', 'maps', 'gtadb-landmarks-7c3f8c2.json',
)
const OUT = join(ROOT, 'src', 'data', 'real-places.json')

if (!existsSync(SRC)) {
  console.error(`[real-places] cannot find ${SRC}`)
  console.error('[real-places] the reference clone is expected at ../gta6-src/navanem-gta6-leonida-atlas')
  process.exit(1)
}

/** entityType in the data to the hub folder the page sits in. */
const HUB_OF = {
  location: 'locations',
  landmark: 'landmarks',
  business: 'businesses',
  brand: 'brands',
}

const norm = (value) =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Every place name on this site, to its page. Places only. */
function buildIndex() {
  const path = join(ROOT, 'src', 'data', 'entities.json')
  if (!existsSync(path)) {
    console.error('[real-places] src/data/entities.json is missing. Run npm run build:data first.')
    process.exit(1)
  }
  const table = new Map()
  for (const entity of JSON.parse(readFileSync(path, 'utf8'))) {
    const hub = HUB_OF[entity.entityType]
    if (!hub) continue
    const target = { url: `/${hub}/${entity.slug}` }
    for (const name of [entity.name, ...(entity.altNames || [])]) {
      const key = norm(name)
      if (key && key.split(' ').length >= 2 && !table.has(key)) table.set(key, target)
    }
  }
  return table
}

const index = buildIndex()

/**
 * The tag the mapper attached, turned into one word a reader understands.
 * A record can carry several, so the first match in this order wins. The
 * level tags (l1, l4) and the housekeeping tags (todo, reused) are ignored.
 */
const KIND_ORDER = [
  ['hotel', 'Hotel'],
  ['restaurant', 'Restaurant'],
  ['retail', 'Shop'],
  ['leisure', 'Leisure'],
  ['events', 'Venue'],
  ['transportation', 'Transport'],
  ['infrastructure', 'Transport'],
  ['government', 'Government'],
  ['public', 'Public'],
  ['utilities', 'Utility'],
  ['industrial', 'Industrial'],
  ['office', 'Office'],
  ['agriculture', 'Farmland'],
  ['natural', 'Nature'],
  ['residential', 'Home'],
  ['landmark', 'Landmark'],
  ['safehouse', 'Safehouse'],
  ['construction', 'Building site'],
]

/** Tags that say the mapper is unsure, or that the real place is gone. */
const DOUBT = new Set(['unconfirmed', 'uncomfirmed', 'may-not-exist', 'address-ambiguous', 'todo'])

/**
 * "Dominion Hotel, Shore Dr, Vice Beach" into name and area.
 *
 * A name that ends in a question mark is the mapper saying they read the sign
 * but are not sure of it. The mark is taken off the name and carried out as a
 * doubt flag instead, so it reaches the reader as words rather than punctuation.
 */
function splitAddress(value) {
  const text = String(value || '').trim()
  const at = text.indexOf(', ')
  const rawName = at < 0 ? text : text.slice(0, at).trim()
  const unsure = rawName.endsWith('?')
  return {
    name: unsure ? rawName.slice(0, -1).trim() : rawName,
    area: at < 0 ? '' : text.slice(at + 2).trim(),
    unsure,
  }
}

/**
 * "W South Beach, 2201 Collins Ave, Miami Beach, FL 33139, USA" into the name
 * of the real place and the street it stands on. The trailing country is
 * dropped because every one of them is in the United States.
 */
function splitReal(value) {
  const parts = String(value || '').split(', ').map((part) => part.trim()).filter(Boolean)
  if (parts[parts.length - 1] === 'USA') parts.pop()
  if (!parts.length) return null
  const street = parts.slice(1).join(', ')
  return { name: parts[0], where: street || null, full: parts.join(', ') }
}

/**
 * The Florida town out of a full address. Every address ends the same way,
 * "<town>, FL <zip>", so the town is the part just before the state. A few
 * records give a plus code or a highway with no town, and those return null.
 */
function cityOf(address) {
  const hit = String(address || '').match(/([^,]+),\s*FL\s*\d{5}/)
  const name = hit ? hit[1].trim() : ''
  return name && !/\d{4}/.test(name) ? name : null
}

const raw = JSON.parse(readFileSync(SRC, 'utf8'))
let linked = 0

const rows = []
for (const item of raw.landmarks || []) {
  const { name, area, unsure } = splitAddress(item.inGameAddress)
  // A name that starts with a question mark is the mapper saying they could
  // not read the sign. It can carry a hint, like "? (N)" for the north half of
  // a block, and it is still not a name, so the whole record is dropped.
  if (!name || name.startsWith('?')) continue
  const real = splitReal(item.realWorldAddress)
  if (!real) continue

  const tags = (item.tags || []).map((tag) => String(tag).toLowerCase())
  const kind = KIND_ORDER.find(([tag]) => tags.includes(tag))
  const link = index.get(norm(name)) || null
  if (link) linked += 1

  rows.push({
    id: item.id,
    name,
    area: area || 'Elsewhere in Leonida',
    kind: kind ? kind[1] : 'Place',
    real: real.name,
    realWhere: real.where,
    realFull: real.full,
    realCity: cityOf(real.full),
    coords: item.realWorldCoordinates || null,
    confidence: item.confidence === 'SUPPORTED' ? 'supported' : 'unknown',
    named: item.evidence?.name === 'KNOWN',
    doubt: unsure || tags.some((tag) => DOUBT.has(tag)),
    gone: tags.includes('demolished'),
    url: link ? link.url : null,
  })
}

rows.sort((a, b) => a.name.localeCompare(b.name))

/** Grouped by the in-game area, biggest area first, names sorted inside it. */
const byArea = new Map()
for (const row of rows) {
  if (!byArea.has(row.area)) byArea.set(row.area, [])
  byArea.get(row.area).push(row)
}
/**
 * The real towns an in-game area draws on, busiest first. One area almost
 * always sits on one town, and that is the most interesting thing the data
 * says, so it is worked out once here rather than in the page.
 */
function citiesIn(items) {
  const tally = new Map()
  for (const row of items) {
    if (!row.realCity) continue
    tally.set(row.realCity, (tally.get(row.realCity) || 0) + 1)
  }
  return [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

const areas = [...byArea.entries()]
  .map(([name, items]) => ({ name, count: items.length, cities: citiesIn(items), items }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

/** How many of each kind, for the page to talk about. */
const kinds = {}
for (const row of rows) kinds[row.kind] = (kinds[row.kind] || 0) + 1

const today = new Date().toISOString().slice(0, 10)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify(
    {
      built: today,
      source: 'GTADB community map of Grand Theft Auto VI',
      sourceUrl: 'https://map.gtadb.org',
      sourceRepo: 'https://github.com/rolux/gtadb.org',
      sourceRevision: raw.source?.revision || null,
      sourceLicense: 'CC BY 4.0',
      via: 'https://github.com/navanem/gta6-leonida-atlas',
      method:
        'Community mappers matched places seen in official GTA VI media to real addresses in Florida. Only records with both a named in-game place and a real-world address are kept. Rockstar has never published any of these pairings. A real place is an analogue, not proof of anything in the game.',
      counts: {
        records: (raw.landmarks || []).length,
        kept: rows.length,
        supported: rows.filter((row) => row.confidence === 'supported').length,
        linked,
        areas: areas.length,
      },
      kinds,
      areas,
    },
    null,
    2,
  ) + '\n',
)

console.log(`[real-places] ${(raw.landmarks || []).length} records in, ${rows.length} kept`)
console.log(`[real-places] ${rows.filter((r) => r.confidence === 'supported').length} supported, ${rows.filter((r) => r.doubt).length} flagged unsure, ${rows.filter((r) => r.gone).length} real place demolished`)
console.log(`[real-places] ${linked} matched a page on this site`)
console.log(`[real-places] ${areas.length} in-game areas`)
for (const area of areas.slice(0, 8)) {
  const town = area.cities[0]
  console.log(`[real-places]   ${area.name} (${area.count}) mostly ${town ? `${town.name}, ${town.count}` : 'no single town'}`)
}
console.log('[real-places] wrote src/data/real-places.json')
