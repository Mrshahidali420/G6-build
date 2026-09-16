// Lane 2, step one: read a saved article and propose facts.
//
// The model is given the saved text and nothing else. It may not use anything
// it already knows about this game, and it is told so. What comes back is a
// list of claims, each one carrying the sentence the model thinks the article
// states and the exact words it read it in.
//
// Then the code checks it, and the code is what matters:
//   1. The quote has to be a real run of characters from the saved text.
//   2. Every number in the written fact has to appear in the saved text too.
// Anything that fails is dropped and counted. There is no path by which a
// sentence the article does not contain reaches data/robot/claims/.
//
// Run: node scripts/robot/extract.mjs
// Writes: data/robot/claims/<rawId>.json, data/robot/extracted.json

import fs from 'node:fs/promises'
import path from 'node:path'
import { ask, modelFor, ready } from './ai.mjs'
import { isVerbatim, numbersBacked } from './checks.mjs'
import { DATA_DIR, RAW_DIR, readJson, writeJson } from './lib.mjs'

if (!ready()) process.exit(0)

export const CLAIMS_DIR = path.join(DATA_DIR, 'claims')
const EXTRACTED_FILE = path.join(DATA_DIR, 'extracted.json')

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

const extracted = new Set(await readJson(EXTRACTED_FILE, []))
const raw = await loadRaw()
const todo = raw.filter((record) => !extracted.has(record.id))

console.log(`extract: ${raw.length} raw items on disk, ${todo.length} not yet read`)

await fs.mkdir(CLAIMS_DIR, { recursive: true })

let read = 0
let kept = 0
let droppedQuote = 0
let droppedNumber = 0
let offTopic = 0
let unprocessed = 0

for (const record of todo) {
  const user = [
    `Outlet: ${record.outlet}`,
    `Headline: ${record.title}`,
    '',
    'Article text:',
    record.text,
  ].join('\n')

  let answer = null
  try {
    answer = await ask({ system: SYSTEM, user, model: modelFor('extract'), maxTokens: 4096 })
  } catch (error) {
    // Left out of extracted.json on purpose. A rate limit is not a verdict on
    // the article, so the next run picks this item up where this one stopped.
    unprocessed += 1
    console.log(`  ${record.id}: not read this run (${error.message})`)
    continue
  }

  read += 1
  extracted.add(record.id)

  if (answer?.aboutGta6 !== true) {
    offTopic += 1
    console.log(`  ${record.id}: the model says this piece is not about GTA 6`)
    continue
  }

  const entities = []

  for (const entity of Array.isArray(answer.entities) ? answer.entities : []) {
    const entityType = String(entity?.entityType ?? '').trim()
    const name = String(entity?.name ?? '').trim()
    if (!name) continue
    if (!ENTITY_TYPES.includes(entityType)) {
      console.log(`  ${record.id}: dropped "${name}", entityType "${entityType}" is not one of the eight`)
      continue
    }

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

      claims.push({ fact, quote })
    }

    if (claims.length) {
      entities.push({
        entityType,
        name,
        altNames: (Array.isArray(entity.altNames) ? entity.altNames : [])
          .map((alt) => String(alt).trim())
          .filter(Boolean),
        claims,
      })
      kept += claims.length
    }
  }

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

  const total = entities.reduce((sum, entity) => sum + entity.claims.length, 0)
  console.log(`  ${record.id}: ${entities.length} entity/entities, ${total} claim(s) survived the checks`)
}

await writeJson(EXTRACTED_FILE, [...extracted].sort())

console.log('')
console.log(`extract: ${read} article(s) read, ${offTopic} judged off topic, ${unprocessed} left for the next run`)
console.log(`extract: ${kept} claim(s) kept, ${droppedQuote} dropped for a quote that is not in the article`)
console.log(`extract: ${droppedNumber} dropped for a number that is not in the article`)
