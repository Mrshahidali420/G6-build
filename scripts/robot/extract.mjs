// Lane 2, step one: read a saved article and propose facts.
//
// There are two readers and the deterministic one is the floor.
//
// The logic reader, in scripts/robot/logic.mjs, matches the names of catalog
// entries against the sentences of the saved article and keeps the whole
// sentence as both the fact and the quote. It cannot invent anything, because
// it never writes a word: every claim it makes is a run of characters lifted
// out of the article. It needs no key and it always runs.
//
// The model reader is the bonus. When a key is configured it is given the
// saved text and nothing else, may not use anything it already knows, and
// comes back with claims carrying the exact words it read them in. Its claims
// are merged on top of the logic claims, and only its claims can name a thing
// that has no catalog entry yet.
//
// Then the code checks both, and the code is what matters:
//   1. The quote has to be a real run of characters from the saved text.
//   2. Every number in the written fact has to appear in the saved text too.
// Anything that fails is dropped and counted. There is no path by which a
// sentence the article does not contain reaches data/robot/claims/.
//
// Run: node scripts/robot/extract.mjs
// Writes: data/robot/claims/<rawId>.json, data/robot/extracted.json

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { ask, hasKey, modelFor, ready } from './ai.mjs'
import { isVerbatim, normalise, numbersBacked } from './checks.mjs'
import { logicClaims } from './logic.mjs'
import { DATA_DIR, RAW_DIR, ROOT, readJson, writeJson } from './lib.mjs'

export const CLAIMS_DIR = path.join(DATA_DIR, 'claims')
const EXTRACTED_FILE = path.join(DATA_DIR, 'extracted.json')
const ENTITIES_JSON = path.join(ROOT, 'src', 'data', 'entities.json')

// The eight types that already exist in data/*.csv. The model picks from this
// list and nothing else, so lane 2 can never open a hub that has no page.
const ENTITY_TYPES = [
  'character',
  'vehicle',
  'location',
  'song',
  'business',
  'brand',
  'landmark',
  'gameplay_feature',
]

const SYSTEM = [
  'You read one news article and report only what that article states.',
  '',
  'Rules, all of them absolute:',
  '- Use only the article text you are given. You have no background knowledge.',
  '- Never guess, never infer, never fill a gap. If the article does not say it, it does not exist.',
  '- Every claim must carry a quote that is copied exactly, character for character, from the article text. Do not tidy it, do not shorten it, do not fix its punctuation.',
  '- A quote must be at least a full clause, long enough that a reader can see the claim in it.',
  '- Numbers, dates and names must appear in the article exactly as you write them.',
  '- If the article is not about Grand Theft Auto VI, set aboutGta6 to false and return no entities.',
  '',
  `entityType must be one of: ${ENTITY_TYPES.join(', ')}.`,
  '',
  'Return JSON only, in this shape:',
  '{"aboutGta6": true, "entities": [{"entityType": "vehicle", "name": "...", "altNames": ["..."], "claims": [{"fact": "one plain sentence", "quote": "exact words from the article"}]}]}',
].join('\n')

async function loadRaw() {
  let names = []
  try {
    names = await fs.readdir(RAW_DIR)
  } catch {
    return []
  }
  const records = []
  for (const name of names.filter((file) => file.endsWith('.json')).sort()) {
    const record = await readJson(path.join(RAW_DIR, name), null)
    if (record?.id && record.text) records.push(record)
  }
  return records
}

/** Every label an entity answers to, flattened, for matching model to logic. */
const labelKeys = (entity) =>
  new Set(
    [entity?.name, ...(entity?.altNames ?? [])]
      .map((label) => normalise(label))
      .filter(Boolean),
  )

/** The logic entity a model entity is talking about, or null for a new one. */
function matchEntity(entities, candidate) {
  const wanted = labelKeys(candidate)
  for (const entity of entities) {
    for (const key of labelKeys(entity)) if (wanted.has(key)) return entity
  }
  return null
}

const usable = ready()
if (!usable) console.log('extract: no AI key, logic only')

// src/data/entities.json is generated and not checked in, so on a fresh
// checkout (every Actions run) it does not exist yet. build-data.mjs is the
// only thing that knows how to read the CSVs, so it is run, not reimplemented.
// Without the catalog the logic floor has nothing to match against, and a run
// that went on anyway would mark every article as read with nothing in it.
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-data.mjs')], { stdio: 'pipe' })
} catch (error) {
  console.log(`extract: build-data.mjs failed, stopping (${error.message})`)
  process.exit(1)
}

const catalog = await readJson(ENTITIES_JSON, [])
if (!Array.isArray(catalog) || !catalog.length) {
  console.log('extract: src/data/entities.json is missing or empty after build-data.mjs, stopping')
  process.exit(1)
}

// The memory of what has been read holds the size of the article it read, as
// "<id>:<characters>". An article that was saved again with more text in it no
// longer matches, so it is read again on its own. That is what a plain list of
// ids could not do: the Newswire articles were saved as a headline and nothing
// else for weeks, and once the fetch was fixed the robot still called them read.
// An entry with no size is an old one and counts as read, as before.
const extractedRows = await readJson(EXTRACTED_FILE, [])
const extracted = new Map()
for (const row of extractedRows) {
  const text = String(row)
  const cut = text.lastIndexOf(':')
  if (cut > 0 && /^\d+$/.test(text.slice(cut + 1))) extracted.set(text.slice(0, cut), Number(text.slice(cut + 1)))
  else extracted.set(text, null)
}

const sizeOf = (record) => String(record.text ?? '').length
const readAlready = (record) => {
  if (!extracted.has(record.id)) return false
  const size = extracted.get(record.id)
  return size === null || size === sizeOf(record)
}

const raw = await loadRaw()
const todo = raw.filter((record) => !readAlready(record))

console.log(`extract: ${raw.length} raw items on disk, ${todo.length} not yet read`)

await fs.mkdir(CLAIMS_DIR, { recursive: true })

let read = 0
let kept = 0
let fromModel = 0
let droppedQuote = 0
let droppedNumber = 0
let offTopic = 0
let unreadByModel = 0

for (const record of todo) {
  // The floor. This never fails and never costs anything.
  const logic = logicClaims(record, catalog)
  const entities = []
  for (const entity of logic.entities) {
    const claims = entity.claims.filter((claim) => isVerbatim(claim.quote, record.text))
    if (claims.length) entities.push({ ...entity, claims })
  }

  let answer = null
  if (hasKey) {
    const user = [
      `Outlet: ${record.outlet}`,
      `Headline: ${record.title}`,
      '',
      'Article text:',
      record.text,
    ].join('\n')
    try {
      answer = await ask({ system: SYSTEM, user, model: modelFor('extract'), maxTokens: 4096 })
    } catch (error) {
      // The record still counts as read, because logic read it. A rate limit
      // is not a verdict on the article and it is not a reason to lose what
      // the deterministic pass already found.
      unreadByModel += 1
      console.log(`  ${record.id}: not read by the model this run (${error.message})`)
    }
  }

  read += 1
  extracted.set(record.id, sizeOf(record))

  const onTopic = logic.aboutGta6 || answer?.aboutGta6 === true
  if (!onTopic) {
    offTopic += 1
    console.log(`  ${record.id}: not about GTA 6, no claims`)
    continue
  }

  for (const entity of Array.isArray(answer?.entities) ? answer.entities : []) {
    const entityType = String(entity?.entityType ?? '').trim()
    const name = String(entity?.name ?? '').trim()
    if (!name) continue
    if (!ENTITY_TYPES.includes(entityType)) {
      console.log(`  ${record.id}: dropped "${name}", entityType "${entityType}" is not one of the eight`)
      continue
    }

    const match = matchEntity(entities, { name, altNames: entity.altNames })
    const already = new Set((match?.claims ?? []).map((claim) => normalise(claim.quote)))
    const claims = []
    for (const claim of Array.isArray(entity.claims) ? entity.claims : []) {
      const fact = String(claim?.fact ?? '').trim()
      const quote = String(claim?.quote ?? '').trim()
      if (!fact || !quote) continue

      // Check 2: the quote must really be in the article.
      if (!isVerbatim(quote, record.text)) {
        droppedQuote += 1
        continue
      }

      // Check 3: a number in the written fact that is nowhere in the article
      // is an invented number, whatever the quote says.
      if (!numbersBacked(fact, record.text)) {
        droppedNumber += 1
        continue
      }

      const key = normalise(quote)
      if (already.has(key)) continue
      already.add(key)
      claims.push({ fact, quote })
    }

    if (!claims.length) continue
    fromModel += claims.length
    if (match) {
      match.claims.push(...claims)
      continue
    }
    entities.push({
      entityType,
      name,
      altNames: (Array.isArray(entity.altNames) ? entity.altNames : [])
        .map((alt) => String(alt).trim())
        .filter(Boolean),
      claims,
    })
  }

  const total = entities.reduce((sum, entity) => sum + entity.claims.length, 0)
  kept += total

  await writeJson(path.join(CLAIMS_DIR, `${record.id}.json`), {
    rawId: record.id,
    outlet: record.outlet,
    tier: record.tier,
    url: record.url,
    published: record.published,
    ogImage: record.ogImage ?? null,
    extractedAt: new Date().toISOString(),
    entities,
  })

  console.log(`  ${record.id}: ${entities.length} entity/entities, ${total} claim(s) survived the checks`)
}

await writeJson(
  EXTRACTED_FILE,
  [...extracted].map(([id, size]) => (size === null ? id : `${id}:${size}`)).sort(),
)

console.log('')
console.log(`extract: ${read} article(s) read, ${offTopic} judged off topic, ${unreadByModel} not read by the model`)
console.log(`extract: ${kept} claim(s) kept, ${droppedQuote} dropped for a quote that is not in the article`)
console.log(`extract: ${droppedNumber} dropped for a number that is not in the article`)
console.log(`extract: ${kept - fromModel} claim(s) from logic, ${fromModel} claim(s) from the model`)
