/**
 * Matches places in the game to the real Florida places they are built from.
 *
 * Vice City is Miami. That is the whole premise of the setting, and the
 * community has spent years standing in front of the real buildings and
 * working out which one is which. That work lives in the GTADB community map
 * (rolux/gtadb.org, CC BY 4.0, credit "gtadb.org and all contributors").
 *
 * This script is the one place that data enters the site. It writes one file,
 * src/data/real-places.json, and both /real-places and the city pages under
 * /real-places/<city> read it through src/lib/real-places.mjs. Grouping by
 * in-game area and by real city happens there, from the same rows, so the
 * two views can never disagree.
 *
 * Rules, all taken straight from the data:
 *
 * - A row needs a sure in-game name and a real-world address. A name that
 *   starts with "?" is the mapper saying they could not read the sign, so the
 *   record is dropped (it is still counted per city as "no readable name").
 * - The real city is the town in the address ("..., Miami, FL 33127"), with
 *   any plus code in front of it removed. Coconut Grove is a neighbourhood of
 *   the City of Miami and is counted as Miami. No other town is merged.
 * - gtadb's own doubt tags (unconfirmed, may-not-exist, address-ambiguous) are
 *   carried through, as are demolished and closed. gtadb has no "checked" or
 *   "supported" flag, so none is claimed.
 * - A row links to a page here only through the reviewed name match in
 *   data/extras/landmark-addresses.json.
 *
 * What this is not: proof of anything Rockstar has said. Rockstar has never
 * published a single one of these pairings.
 *
 * The source is not inside this repo, so the output file is committed.
 * Refresh it with a sparse clone next to this repo:
 *
 *   git clone --filter=blob:none --sparse https://github.com/rolux/gtadb.org ../gta6-src/rolux-gtadb.org
 *   git -C ../gta6-src/rolux-gtadb.org sparse-checkout set map/data/6
 *   node scripts/import/real-places.mjs
 *
 * GTADB_DIR overrides where the clone is looked for.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const GTADB = process.env.GTADB_DIR || join(ROOT, '..', 'gta6-src', 'rolux-gtadb.org')
const SRC = join(GTADB, 'map', 'data', '6', 'landmarks.json')
const OUT = join(ROOT, 'src', 'data', 'real-places.json')
const ADDRESSES = join(ROOT, 'data', 'extras', 'landmark-addresses.json')
const TRACKER = join(ROOT, 'src', 'content', 'tracker')

/** A neighbourhood gtadb writes as its own town, to the city it sits in. */
const NEIGHBOURHOOD_OF = { 'Coconut Grove': 'Miami' }

/**
 * Places people search for by name. Each is looked up the same way, and the
 * page says what was found, including nothing. The tracker slugs are posts
 * already on this site about the same place.
 */
const ASKED = [
  { key: 'lakeland', label: 'Lakeland', city: 'Lakeland' },
  { key: 'doral', label: 'Doral', city: 'Doral' },
  { key: 'hialeah', label: 'Hialeah', city: 'Hialeah' },
  { key: 'cedar-key', label: 'Cedar Key', city: 'Cedar Key' },
  {
    key: 'cape-canaveral',
    label: 'Cape Canaveral',
    text: 'Cape Canaveral',
    tracker: [
      'eagle-eyed-fan-spots-potential-cape-canaveral-launch-tower-in-gta-6',
      'gta-6-fan-spot-hints-at-potential-cape-canaveral-equivalent-in-leonida',
    ],
  },
  {
    key: 'vercetti-estate',
    label: 'Vercetti Estate',
    name: 'Vercetti Estate',
    tracker: [
      'is-the-vercetti-estate-returning-in-gta-6-new-screenshot-sparks',
      'do-you-think-the-vercetti-estate-will-return-in-gta-6',
    ],
  },
]

/**
 * The tag the mapper attached, turned into one word a reader understands.
 * A record can carry several, so the first match in this order wins.
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

const DOUBT = new Set(['unconfirmed', 'uncomfirmed', 'may-not-exist', 'address-ambiguous', 'doesnt-exist?'])

if (!existsSync(SRC)) {
  console.error(`[real-places] cannot find ${SRC}`)
  console.error('[real-places] see the header of this script for the clone command')
  process.exit(1)
}

function commitOf(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const PLUS_CODE = /\b[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}\b,?\s*/g

/** "..., Miami, FL 33127, USA" or "..., Cedar Key, Florida, USA" to the town. */
function cityOf(address) {
  const text = String(address || '').replace(PLUS_CODE, '')
  const hit =
    text.match(/([^,]+),\s*(?:FL|Florida)\s*\d{5}/) || text.match(/([^,]+),\s*Florida\s*,\s*USA$/)
  const name = hit ? hit[1].trim() : ''
  if (!name || /\d/.test(name)) return null
  return NEIGHBOURHOOD_OF[name] || name
}

/** "W South Beach, 2201 Collins Ave, Miami Beach, FL 33139, USA" to name and street. */
function splitReal(value) {
  const parts = String(value || '').split(', ').map((part) => part.trim()).filter(Boolean)
  if (parts[parts.length - 1] === 'USA') parts.pop()
  // "3R7C+C62 Raiford, Florida" has no street address at all, only a plus
  // code. The town becomes the name and the code is kept as the locator.
  const code = (parts[0] || '').match(/^([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3})\s+(.+)$/)
  if (code) return { real: code[2], realWhere: `Plus code ${code[1]}` }
  return { real: parts[0] || '', realWhere: parts.slice(1).join(', ') || null }
}

const cleanTag = (tag) => String(tag).toLowerCase().replace(/^(\/\/|#|@)/, '')

/** gtadb id to our entity slug, from the reviewed address match. */
const slugOfId = new Map()
for (const [slug, entry] of Object.entries(JSON.parse(readFileSync(ADDRESSES, 'utf8')))) {
  if (slug.startsWith('_') || !entry?.gtadb_id) continue
  slugOfId.set(entry.gtadb_id, slug)
}

const raw = JSON.parse(readFileSync(SRC, 'utf8'))
const all = []
for (const [id, record] of Object.entries(raw)) {
  const [ingame, , , realAddress, realCoords, , tags] = record
  const parts = String(ingame || '').split(', ').map((part) => part.trim())
  const rawName = parts[0] || ''
  const clean = (tags || []).map(cleanTag)
  const kind = KIND_ORDER.find(([tag]) => clean.includes(tag))
  const { real, realWhere } = splitReal(realAddress)
  const hasCoords = Array.isArray(realCoords) && Number.isFinite(realCoords[0]) && Number.isFinite(realCoords[1])
  all.push({
    id,
    sure: Boolean(rawName) && !rawName.startsWith('?'),
    address: realAddress || '',
    row: {
      id,
      name: rawName.replace(/\?$/, '').trim(),
      nameUnsure: rawName.endsWith('?') || undefined,
      area: parts.length > 1 ? parts.slice(1).join(', ') : 'Elsewhere in Leonida',
      district: parts.length > 2 ? parts.slice(1, -1).join(', ') : null,
      region: parts.length > 1 ? parts[parts.length - 1] : null,
      kind: kind ? kind[1] : 'Place',
      real,
      realWhere,
      city: realAddress ? cityOf(realAddress) : null,
      lat: hasCoords ? Number(realCoords[0].toFixed(6)) : null,
      lng: hasCoords ? Number(realCoords[1].toFixed(6)) : null,
      unconfirmed: clean.some((tag) => DOUBT.has(tag)) || undefined,
      gone: clean.includes('demolished') || undefined,
      closed: clean.includes('closed') || undefined,
      entity: slugOfId.get(id) || null,
    },
  })
}

const byName = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id, 'en', { numeric: true })
const kept = all.filter((item) => item.sure && item.address)
const rows = kept.map((item) => item.row).sort(byName)

/** Records with a real address but no readable in-game name, per city. */
const unnamedByCity = {}
for (const item of all) {
  if (item.sure || !item.address || !item.row.city) continue
  unnamedByCity[item.row.city] = (unnamedByCity[item.row.city] || 0) + 1
}

const trackerExists = (slug) => existsSync(join(TRACKER, `${slug}.md`))
const asked = ASKED.map((query) => {
  let hits
  if (query.city) hits = all.filter((item) => item.address && item.row.city === query.city)
  else if (query.text) hits = all.filter((item) => item.address.includes(query.text))
  else hits = all.filter((item) => item.sure && item.row.name === query.name)
  const sure = hits.filter((item) => item.sure && item.address).map((item) => item.row).sort(byName)
  return {
    key: query.key,
    label: query.label,
    by: query.city ? 'city' : query.text ? 'address' : 'name',
    city: query.city || null,
    ids: sure.map((row) => row.id),
    unnamed: hits.filter((item) => !item.sure).length,
    tracker: (query.tracker || []).filter(trackerExists),
  }
})
const missingTracker = ASKED.flatMap((query) => (query.tracker || []).filter((slug) => !trackerExists(slug)))
if (missingTracker.length) console.warn(`[real-places] tracker posts not found: ${missingTracker.join(', ')}`)

const kinds = {}
for (const row of rows) kinds[row.kind] = (kinds[row.kind] || 0) + 1

const today = new Date().toISOString().slice(0, 10)
const out = {
  built: today,
  source: 'GTADB community map of Grand Theft Auto VI',
  sourceUrl: 'https://map.gtadb.org',
  sourceRepo: 'https://github.com/rolux/gtadb.org',
  sourceCommit: commitOf(GTADB),
  sourceLicense: 'CC BY 4.0',
  sourceLicenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  credit: 'gtadb.org and all contributors',
  method:
    'Community mappers matched places seen in official GTA VI media to real addresses in Florida. Only records with both a readable in-game name and a real-world address are kept. Rockstar has never published any of these pairings. A real place is an analogue, not proof of anything in the game.',
  counts: {
    records: all.length,
    named: all.filter((item) => item.sure).length,
    kept: rows.length,
    unconfirmed: rows.filter((row) => row.unconfirmed).length,
    gone: rows.filter((row) => row.gone).length,
    linked: rows.filter((row) => row.entity).length,
  },
  kinds,
  unnamedByCity,
  asked,
  rows,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

console.log(`[real-places] gtadb ${out.sourceCommit || 'unknown commit'}: ${all.length} records, ${out.counts.named} with a readable name, ${rows.length} kept`)
console.log(`[real-places] ${out.counts.unconfirmed} tagged unconfirmed, ${out.counts.gone} demolished, ${out.counts.linked} linked to a page here`)
for (const item of asked) {
  console.log(`[real-places]   asked ${item.label}: ${item.ids.length} named, ${item.unnamed} unnamed, tracker ${item.tracker.length}`)
}
console.log('[real-places] wrote src/data/real-places.json')
