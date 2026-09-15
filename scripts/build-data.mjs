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
const OUT_FILE = join(ROOT, 'src', 'content', 'entities.json')
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

phase(`wrote ${entities.length} entities to src/content/entities.json`)
console.log('[build-data] by type:', byType)

if (rejected.length) {
  console.log(`[build-data] ${rejected.length} row(s) rejected as too thin to be a page:`)
  for (const row of rejected) console.log(`  - ${row.name} (${row.words} words): ${row.reason}`)
}
