// Turns every CSV in data/ into one validated JSON array the site builds from.
// Run by `npm run build` before astro build. Also runnable alone: `npm run data`.
//
// Two jobs it does that matter:
//   1. De-duplicates entities that appear in more than one CSV (Leonida and
//      Vice City each appear twice), keeping the best-sourced row and merging
//      the other row's source URL in rather than throwing it away.
//   2. Refuses to emit a row that is too thin to be a page. A thin page is the
//      single biggest risk on a small site. See LESSONS-FROM-MANHWAINDEX.md.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data')
const OUT_FILE = join(ROOT, 'src', 'data', 'entities.json')
const REPORT_FILE = join(ROOT, 'data', '_build-report.json')

const MIN_LONG_DESCRIPTION_WORDS = 60

const TIER_RANK = {
  TIER_1_OFFICIAL: 4,
  TIER_2_MAJOR_PRESS: 3,
  TIER_3_COMMUNITY: 2,
  TIER_4_UNSOURCED: 1,
}

const CONFIDENCE_RANK = { HIGH: 4, MEDIUM: 3, LOW: 2, UNCONFIRMED: 1 }

const started = Date.now()
const phase = (label) =>
  console.log(`[build-data] ${label} (+${((Date.now() - started) / 1000).toFixed(1)}s)`)

/** Minimal RFC-4180 CSV parser. Handles quoted fields and doubled quotes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((value) => value !== '')) rows.push(row)
  return rows
}

const splitList = (value) =>
  (value ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

const countWords = (value) => (value ?? '').trim().split(/\s+/).filter(Boolean).length

function scoreRow(row) {
  return (TIER_RANK[row.source_tier] ?? 0) * 10 + (CONFIDENCE_RANK[row.confidence] ?? 0)
}

phase('reading data/')

const csvFiles = readdirSync(DATA_DIR).filter(
  (name) => name.endsWith('.csv') && !name.startsWith('_') && !name.startsWith('keywords'),
)

const rawRows = []

for (const fileName of csvFiles) {
  const rows = parseCsv(readFileSync(join(DATA_DIR, fileName), 'utf8'))
  if (rows.length < 2) continue

  const header = rows[0].map((column) => column.trim())

  for (const values of rows.slice(1)) {
    if (values.length !== header.length) {
      throw new Error(
        `${fileName}: row has ${values.length} fields, header has ${header.length}. Fix the CSV.`,
      )
    }
    const record = Object.fromEntries(header.map((key, index) => [key, values[index].trim()]))
    record._source_file = fileName
    rawRows.push(record)
  }
}

phase(`parsed ${rawRows.length} rows from ${csvFiles.length} files`)

// --- de-duplicate ------------------------------------------------------------

const bySlug = new Map()
const merged = []

for (const row of rawRows) {
  if (!row.slug) throw new Error(`${row._source_file}: row "${row.name}" has no slug.`)

  const existing = bySlug.get(row.slug)
  if (!existing) {
    bySlug.set(row.slug, row)
    continue
  }

  const winner = scoreRow(row) > scoreRow(existing) ? row : existing
  const loser = winner === row ? existing : row

  winner._extra_sources = [
    ...(winner._extra_sources ?? []),
    ...(loser.source_url && loser.source_url !== 'NONE' && loser.source_url !== winner.source_url
      ? [loser.source_url]
      : []),
  ]
  winner._also_typed_as = [...(winner._also_typed_as ?? []), loser.entity_type]

  // A named place can arrive as both "landmark" and "location". The place wins,
  // so every real place sits under one hub instead of being split across two.
  if ([winner.entity_type, loser.entity_type].includes('location')) {
    winner.entity_type = 'location'
  }

  bySlug.set(row.slug, winner)
  merged.push({ slug: row.slug, kept: winner._source_file, dropped: loser._source_file })
}

phase(`de-duplicated to ${bySlug.size} entities (${merged.length} merges)`)

// --- thin-content gate -------------------------------------------------------

const entities = []
const rejected = []

for (const row of bySlug.values()) {
  const words = countWords(row.long_description)

  if (words < MIN_LONG_DESCRIPTION_WORDS) {
    rejected.push({ slug: row.slug, name: row.name, words, reason: 'long_description too short' })
    continue
  }
  if (!row.short_description) {
    rejected.push({ slug: row.slug, name: row.name, words, reason: 'no short_description' })
    continue
  }

  const sources = [
    ...(row.source_url && row.source_url !== 'NONE' ? [row.source_url] : []),
    ...(row._extra_sources ?? []),
  ]

  entities.push({
    id: row.slug,
    entityType: row.entity_type,
    name: row.name,
    altNames: splitList(row.alt_names),
    slug: row.slug,
    category: row.category,
    subcategory: row.subcategory,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    keyFacts: splitList(row.key_facts),
    realWorldBasis: row.real_world_basis || undefined,
    firstShownIn: row.first_shown_in || undefined,
    firstShownDate: row.first_shown_date || undefined,
    confirmedStatus: row.confirmed_status,
    sourceTier: row.source_tier,
    sources: [...new Set(sources)],
    sourceDate: row.source_date || undefined,
    confidence: row.confidence,
    officialImageExists: row.official_image_exists === 'YES',
    relatedEntities: splitList(row.related_entities),
    searchTerms: splitList(row.search_terms),
    notes: row.notes || undefined,
    wordCount: words,
  })
}

// Hand written extras, one file per slug in data/extras/. These hold the
// question and answer pairs, the open questions, and the provenance note that
// the CSV rows have no column for. A missing file is normal, not an error.
const EXTRAS_DIR = join(ROOT, 'data', 'extras')
let extrasCount = 0
for (const entity of entities) {
  let extra
  try {
    extra = JSON.parse(readFileSync(join(EXTRAS_DIR, `${entity.slug}.json`), 'utf8'))
  } catch {
    continue
  }
  if (Array.isArray(extra.faq) && extra.faq.length) entity.faq = extra.faq
  if (Array.isArray(extra.notKnown) && extra.notKnown.length) entity.notKnown = extra.notKnown
  if (typeof extra.howWeKnow === 'string' && extra.howWeKnow.trim()) entity.howWeKnow = extra.howWeKnow.trim()
  extrasCount += 1
}

// In-game facts, hand filled after launch in data/ingame.json, keyed by slug.
// Empty ({}) until the game is out. Every entry must carry a source, and a bad
// entry stops the build, the same as a bad CSV row: a wrong "where to find it"
// line is worse than none. See docs/INGAME-DATA.md for how to fill it.
const INGAME_FILE = join(ROOT, 'data', 'ingame.json')

// Which fields each kind of entry may carry. JSON key -> key on the entity.
const INGAME_FIELDS = {
  vehicle: { location: 'location', price: 'price', class: 'class', how_to_get: 'howToGet' },
  business: { location: 'location', buyable: 'buyable', price: 'price' },
  song: { radio_station: 'radioStation' },
  weapon: { location: 'location', price: 'price' },
  landmark: { how_to_get_there: 'howToGetThere' },
  location: { how_to_get_there: 'howToGetThere' },
}

function readInGame(entityBySlug) {
  let raw
  try {
    raw = readFileSync(INGAME_FILE, 'utf8')
  } catch {
    return new Map()
  }

  const fail = (slug, message) => {
    throw new Error(`data/ingame.json: "${slug}": ${message}. See docs/INGAME-DATA.md.`)
  }

  const parsed = JSON.parse(raw)
  const result = new Map()

  for (const [slug, entry] of Object.entries(parsed)) {
    const entity = entityBySlug.get(slug)
    if (!entity) fail(slug, 'no entry has this slug')

    const allowed = INGAME_FIELDS[entity.entityType]
    if (!allowed) fail(slug, `a ${entity.entityType} entry takes no in-game fields`)

    const { source, ...fields } = entry ?? {}
    if (!source || typeof source.label !== 'string' || !source.label.trim()) fail(slug, 'source.label is missing')
    if (typeof source.url !== 'string' || !/^https?:\/\/\S+$/.test(source.url.trim())) fail(slug, 'source.url is missing or not a web address')

    const facts = {}
    for (const [key, value] of Object.entries(fields)) {
      const target = allowed[key]
      if (!target) fail(slug, `"${key}" is not a field for a ${entity.entityType}. Allowed: ${Object.keys(allowed).join(', ')}`)
      if (key === 'buyable') {
        if (typeof value !== 'boolean') fail(slug, '"buyable" must be true or false, without quotes')
        facts[target] = value
      } else {
        if (typeof value !== 'string' || !value.trim()) fail(slug, `"${key}" must be non-empty text`)
        facts[target] = value.trim()
      }
    }
    if (!Object.keys(facts).length) fail(slug, 'has a source but no fact')

    result.set(slug, { ...facts, source: { label: source.label.trim(), url: source.url.trim() } })
  }

  return result
}

const inGame = readInGame(new Map(entities.map((entity) => [entity.slug, entity])))
for (const entity of entities) {
  const facts = inGame.get(entity.slug)
  if (facts) entity.inGame = facts
}

// Real-world counterparts, one shared file per kind in data/extras/. These are
// keyed by slug inside the file, unlike the per-slug extras above, so they are
// read here by name. Each row names its own source and licence, and a bad row
// stops the build: a wrong real-world address is worse than none.
const REAL_WORLD_FILES = [
  {
    file: 'vehicle-real-life.json',
    types: ['vehicle'],
    key: 'realLife',
    pick: (row) => ({ basedOn: text(row.based_on) }),
  },
  {
    file: 'landmark-addresses.json',
    types: ['landmark', 'business', 'location'],
    key: 'realPlace',
    pick: (row) => ({
      address: text(row.real_address),
      lat: coord(row.real_lat, 90),
      lng: coord(row.real_lng, 180),
      gtadbName: text(row.gtadb_name) || undefined,
    }),
  },
  {
    file: 'wildlife-species.json',
    types: ['wildlife'],
    key: 'species',
    pick: (row) => ({
      commonName: text(row.common_name),
      scientificName: text(row.scientific_name),
      rank: text(row.rank) || undefined,
    }),
  },
]

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function coord(value, limit) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null
}

function readRealWorld(entityBySlug) {
  let count = 0
  for (const { file, types, key, pick } of REAL_WORLD_FILES) {
    let parsed
    try {
      parsed = JSON.parse(readFileSync(join(EXTRAS_DIR, file), 'utf8'))
    } catch {
      continue
    }
    const fail = (slug, message) => {
      throw new Error(`data/extras/${file}: "${slug}": ${message}`)
    }
    for (const [slug, row] of Object.entries(parsed)) {
      const entity = entityBySlug.get(slug)
      if (!entity) fail(slug, 'no entry has this slug')
      if (!types.includes(entity.entityType)) fail(slug, `a ${entity.entityType} entry cannot carry this`)
      const source = row?.source ?? {}
      if (!text(source.label)) fail(slug, 'source.label is missing')
      if (!/^https:\/\/\S+$/.test(text(source.url))) fail(slug, 'source.url is missing or not a web address')
      const fields = pick(row)
      for (const [name, value] of Object.entries(fields)) {
        if (value === '' || value === null) fail(slug, `"${name}" is missing or invalid`)
      }
      entity[key] = {
        ...fields,
        basis: text(row.basis) || undefined,
        source: { label: text(source.label), url: text(source.url) },
      }
      count += 1
    }
  }
  return count
}

const realWorldCount = readRealWorld(new Map(entities.map((entity) => [entity.slug, entity])))

// A photo of the real vehicle behind a vehicle's real-life basis, from
// Wikimedia Commons under a free licence. It hangs off realLife only, so it
// never reaches the hero, the tiles, the OG image or lib/images.mjs. Every row
// must point at a file in public/img/real-cars/ and carry its credit line and
// Commons file page; a bad row stops the build, like the files above.
const REAL_PHOTOS_FILE = 'vehicle-real-photos.json'
const REAL_PHOTO_PATH = /^\/img\/real-cars\/[a-z0-9-]+\.jpg$/

// Width and height from a JPEG's start-of-frame marker, so the page can set
// both on the <img> and not shift while it loads.
function jpegSize(buffer) {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    }
    offset += 2 + length
  }
  return null
}

function readRealPhotos(entityBySlug) {
  let parsed
  try {
    parsed = JSON.parse(readFileSync(join(EXTRAS_DIR, REAL_PHOTOS_FILE), 'utf8'))
  } catch {
    return 0
  }
  const fail = (slug, message) => {
    throw new Error(`data/extras/${REAL_PHOTOS_FILE}: "${slug}": ${message}`)
  }
  let count = 0
  for (const [slug, row] of Object.entries(parsed)) {
    const entity = entityBySlug.get(slug)
    if (!entity) fail(slug, 'no entry has this slug')
    if (!entity.realLife) fail(slug, 'has a photo but no real-life basis in vehicle-real-life.json')
    const file = text(row?.file)
    if (!REAL_PHOTO_PATH.test(file)) fail(slug, 'file must look like /img/real-cars/<slug>.jpg')
    let size
    try {
      size = jpegSize(readFileSync(join(ROOT, 'public', file)))
    } catch {
      fail(slug, `${file} is missing from public/`)
    }
    if (!size) fail(slug, `${file} is not a readable JPEG`)
    const credit = text(row?.credit)
    if (!credit.startsWith('Real-world ') || !credit.includes('(not a game image)')) {
      fail(slug, 'credit must start "Real-world <model> (not a game image)."')
    }
    const source = text(row?.source)
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/.test(source)) fail(slug, 'source must be the Commons file page')
    entity.realLife.photo = { src: file, ...size, credit, source }
    count += 1
  }
  return count
}

const realPhotoCount = readRealPhotos(new Map(entities.map((entity) => [entity.slug, entity])))

entities.sort((a, b) => a.entityType.localeCompare(b.entityType) || a.name.localeCompare(b.name))

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(entities, null, 2), 'utf8')

const byType = entities.reduce((acc, entity) => {
  acc[entity.entityType] = (acc[entity.entityType] ?? 0) + 1
  return acc
}, {})

writeFileSync(
  REPORT_FILE,
  JSON.stringify({ generatedAt: new Date().toISOString(), byType, merged, rejected }, null, 2),
  'utf8',
)

phase(`wrote ${entities.length} entities to src/data/entities.json`)
phase(`${extrasCount} of ${entities.length} entities have a data/extras file`)
phase(`${inGame.size} of ${entities.length} entities have in-game facts in data/ingame.json`)
phase(`${realWorldCount} entities have a real-world counterpart from data/extras`)
phase(`${realPhotoCount} vehicles have a real-vehicle photo from data/extras/${REAL_PHOTOS_FILE}`)
console.log('[build-data] by type:', byType)

if (rejected.length) {
  console.log(`[build-data] ${rejected.length} row(s) rejected as too thin to be a page:`)
  for (const row of rejected) console.log(`  - ${row.name} (${row.words} words): ${row.reason}`)
}
