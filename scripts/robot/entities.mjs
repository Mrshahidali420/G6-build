// Lane 2, step two: turn checked claims into catalog work.
//
// Two outcomes, and the difference between them is the whole design.
//
// An entry that already exists is never rewritten. New claims are appended to
// data/robot/facts/<slug>.json and the page renders them under "Reported since
// this entry was written", each one as the outlet's own words with a link. A
// robot that only appends cannot damage a page a person wrote.
//
// An entry that does not exist yet may be written, but only after it clears
// every gate below, and a model's opinion is not one of them:
//   - Eligibility: an official source, or two different outlets saying it.
//   - 120 words of description, which is double the site minimum.
//   - 4 key facts.
//   - Every number in every written field appears in one of the quotes.
//   - No em dash.
//   - The slug is not already taken.
//   - A second model pass marks each written sentence supported or not, and
//     every unsupported sentence is deleted. If deleting them drops the entry
//     under the word or fact bar, the entry is refused.
//
// A refused entry is saved with its reason and its claims so a person can
// finish it. The workflow opens one issue per refusal.
//
// Run: node scripts/robot/entities.mjs
// Writes: data/robot/facts/, data/robot-entities.csv, data/extras/,
//         public/img/entities/, data/robot/refused/, data/robot/entities.json

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { ask, hasKey, modelFor, ready } from './ai.mjs'
import {
  countWords,
  hasEmDash,
  normalise,
  numbersIn,
  sentencesIn,
  slugify,
} from './checks.mjs'
import { DATA_DIR, RAW_DIR, ROOT, readJson, writeJson } from './lib.mjs'

// Appending a dated fact to an entry that already exists is pure code and it
// always runs. Only a new entry needs a model, because deciding that a name is
// a thing worth its own page is a judgement, and code does not make those.
ready()

const CLAIMS_DIR = path.join(DATA_DIR, 'claims')
const FACTS_DIR = path.join(DATA_DIR, 'facts')
const REFUSED_DIR = path.join(DATA_DIR, 'refused')
const LEDGER_FILE = path.join(DATA_DIR, 'entities.json')
const CSV_FILE = path.join(ROOT, 'data', 'robot-entities.csv')
const EXTRAS_DIR = path.join(ROOT, 'data', 'extras')
const IMG_DIR = path.join(ROOT, 'public', 'img', 'entities')
const CREDITS_FILE = path.join(IMG_DIR, 'credits.json')
const ENTITIES_JSON = path.join(ROOT, 'src', 'data', 'entities.json')

const HEADERS = [
  'entity_type', 'name', 'alt_names', 'slug', 'category', 'subcategory',
  'short_description', 'long_description', 'key_facts', 'real_world_basis',
  'first_shown_in', 'first_shown_date', 'confirmed_status', 'source_tier',
  'source_url', 'source_date', 'confidence', 'official_image_exists',
  'related_entities', 'search_terms', 'notes',
]

const MIN_WORDS = 120
const MIN_KEY_FACTS = 4
const MIN_IMAGE_WIDTH = 800

// --- the catalog as it stands -----------------------------------------------

// build-data.mjs is the only thing that knows how to read the CSVs, so it is
// run rather than reimplemented. A lane 2 run that guessed at the catalog
// would eventually write a duplicate of a page that already exists.
try {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-data.mjs')], { stdio: 'pipe' })
} catch (error) {
  console.log(`entities: build-data.mjs failed, stopping (${error.message})`)
  process.exit(1)
}

const catalog = await readJson(ENTITIES_JSON, [])
const takenSlugs = new Set(catalog.map((entity) => entity.slug))

// name or alt name, flattened, to the slug that owns it
const nameIndex = new Map()
for (const entity of catalog) {
  for (const label of [entity.name, entity.slug, ...(entity.altNames ?? [])]) {
    const key = normalise(label)
    if (key && !nameIndex.has(key)) nameIndex.set(key, entity.slug)
  }
}

const matchSlug = (name, altNames) => {
  for (const label of [name, ...(altNames ?? [])]) {
    const hit = nameIndex.get(normalise(label)) ?? nameIndex.get(normalise(slugify(label)))
    if (hit) return hit
  }
  return null
}

// --- read every claims file --------------------------------------------------

let claimFiles = []
try {
  claimFiles = (await fs.readdir(CLAIMS_DIR)).filter((name) => name.endsWith('.json')).sort()
} catch {
  claimFiles = []
}

if (!claimFiles.length) {
  console.log('entities: no claim files yet, nothing to do')
  process.exit(0)
}

const existingGroups = new Map()
const newGroups = new Map()

for (const file of claimFiles) {
  const doc = await readJson(path.join(CLAIMS_DIR, file), null)
  if (!doc?.entities) continue

  for (const entity of doc.entities) {
    const slug = matchSlug(entity.name, entity.altNames)
    const record = {
      rawId: doc.rawId,
      outlet: doc.outlet,
      tier: doc.tier,
      url: doc.url,
      published: doc.published,
      ogImage: doc.ogImage ?? null,
      entityType: entity.entityType,
      name: entity.name,
      altNames: entity.altNames ?? [],
      // Logic sets this. A model claim has no flag and is kept.
      salient: entity.salient !== false,
      claims: entity.claims,
    }

    const target = slug ? existingGroups : newGroups
    const key = slug ?? `${entity.entityType}:${normalise(entity.name)}`
    if (!target.has(key)) target.set(key, [])
    target.get(key).push(record)
  }
}

console.log(`entities: ${claimFiles.length} claim file(s), ${existingGroups.size} known entry/entries, ${newGroups.size} candidate(s) for a new entry`)

// --- existing entries: append, never rewrite ---------------------------------

await fs.mkdir(FACTS_DIR, { recursive: true })
let appended = 0

for (const [slug, records] of existingGroups) {
  const file = path.join(FACTS_DIR, `${slug}.json`)
  const current = await readJson(file, [])
  const seenQuotes = new Set(current.map((item) => normalise(item.quote)))
  const added = []

  for (const record of records) {
    // A logic claim from an article that only mentions the entry in passing
    // is background, not a fact about the entry. Model claims carry no flag.
    if (record.salient === false) continue
    for (const claim of record.claims) {
      const key = normalise(claim.quote)
      if (seenQuotes.has(key)) continue
      seenQuotes.add(key)
      added.push({
        fact: claim.fact,
        quote: claim.quote,
        outlet: record.outlet,
        tier: record.tier,
        url: record.url,
        published: record.published,
        added: new Date().toISOString().slice(0, 10),
      })
    }
  }

  if (!added.length) continue
  await writeJson(file, [...current, ...added])
  appended += added.length
  console.log(`  ${slug}: ${added.length} new fact(s) appended`)
}

// --- new entries --------------------------------------------------------------

const ledger = await readJson(LEDGER_FILE, { accepted: [], refused: [] })
const alreadyHandled = new Set([...(ledger.accepted ?? []), ...(ledger.refused ?? [])])

const TIER_RANK = { TIER_1_OFFICIAL: 3, TIER_2_MAJOR_PRESS: 2, TIER_3_COMMUNITY: 1 }
const bestRecord = (records) =>
  [...records].sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0))[0]

const WRITE_SYSTEM = [
  'You write one row of a factual catalog of Grand Theft Auto VI.',
  '',
  'You are given a list of verified claims. Each claim carries the exact words an outlet',
  'published. Those quotes are the entire world of facts you have. You have no background',
  'knowledge of this game and you may not use any.',
  '',
  'Absolute rules:',
  '- Every sentence you write must be supported by one of the quotes. If you cannot support it, do not write it.',
  '- Never invent a date, a price, a name, a mission, a voice actor, a map location, a statistic or a mechanic.',
  '- Every number you write must appear in one of the quotes, written the same way.',
  '- No em dash anywhere. Use a comma, a full stop or a colon.',
  '- No emoji. No hype. No "iconic", "highly anticipated", "stunning", "beloved", "fans".',
  '- Plain words, short sentences. This is a public record, not a blog post.',
  '- Write "Grand Theft Auto VI" on first mention, "GTA 6" after that.',
  '- Never claim the site has played the game or seen anything first hand.',
  '',
  `long_description must be at least ${MIN_WORDS} words of plain prose and every one of them must be supportable.`,
  `key_facts must hold at least ${MIN_KEY_FACTS} short factual phrases.`,
  'faq holds 3 to 5 question and answer pairs. Answers are 25 to 60 words. At least one pair must be a',
  'question the claims cannot fully answer, answered honestly by saying what Rockstar has not said.',
  'notKnown holds 2 to 4 real open questions, as short phrases. Not filler.',
  '',
  'Return JSON only, exactly this shape:',
  '{"name":"","alt_names":[],"slug":"","category":"","subcategory":"","short_description":"",',
  '"long_description":"","key_facts":[],"real_world_basis":"","first_shown_in":"","first_shown_date":"",',
  '"related_entities":[],"search_terms":[],"faq":[{"q":"","a":""}],"notKnown":[]}',
  '',
  'Column meanings: category is the broad group, usually the same word as the entity type.',
  'subcategory is the narrow kind, for example "sports car" or "radio station". short_description is one',
  'sentence under 160 characters. real_world_basis is only filled when a quote names a real world thing,',
  'otherwise leave it empty. first_shown_in names the source that showed it, first_shown_date is its ISO date.',
  'search_terms are 4 to 8 phrases a person would actually type. related_entities are names, not slugs.',
].join('\n')

const SUPPORT_SYSTEM = [
  'You are checking whether each numbered sentence is supported by the quotes you are given.',
  '',
  'A sentence is supported only when the quotes state it. Not when the quotes make it likely,',
  'not when it is common knowledge, not when it is a reasonable summary of something adjacent.',
  'If a sentence adds a fact the quotes do not contain, it is not supported.',
  '',
  'Return JSON only: {"results":[{"n":1,"supported":true},{"n":2,"supported":false}]}',
  'Return one entry for every numbered sentence you were given.',
].join('\n')

function csvField(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

async function appendCsvRow(row) {
  let text = ''
  try {
    text = await fs.readFile(CSV_FILE, 'utf8')
  } catch {
    text = `${HEADERS.map(csvField).join(',')}\n`
  }
  if (text && !text.endsWith('\n')) text += '\n'
  text += `${HEADERS.map((key) => csvField(row[key])).join(',')}\n`
  await fs.writeFile(CSV_FILE, text, 'utf8')
}

async function refuse(slug, reason, records, written) {
  await fs.mkdir(REFUSED_DIR, { recursive: true })
  await writeJson(path.join(REFUSED_DIR, `${slug}.json`), {
    slug,
    reason,
    refusedAt: new Date().toISOString().slice(0, 10),
    written: written ?? null,
    claims: records.flatMap((record) =>
      record.claims.map((claim) => ({ ...claim, outlet: record.outlet, url: record.url, tier: record.tier })),
    ),
  })
  console.log(`  refused ${slug}: ${reason}`)
}

// og:image, but only when it is a picture of this thing rather than the
// outlet's share card. An outlet that puts the same og:image on two saved
// articles is showing us its logo, so that URL is disqualified for everyone.
let ogUseCount = new Map()
try {
  for (const name of await fs.readdir(RAW_DIR)) {
    if (!name.endsWith('.json')) continue
    const record = await readJson(path.join(RAW_DIR, name), null)
    if (!record?.ogImage) continue
    const key = `${record.outlet}|${record.ogImage}`
    ogUseCount.set(key, (ogUseCount.get(key) ?? 0) + 1)
  }
} catch {
  ogUseCount = new Map()
}

async function fetchImage(slug, records) {
  const ordered = [...records].sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0))
  const { default: sharp } = await import('sharp')

  for (const record of ordered) {
    if (!record.ogImage) continue
    if ((ogUseCount.get(`${record.outlet}|${record.ogImage}`) ?? 0) > 1) {
      console.log(`    image skipped: ${record.outlet} uses that og:image on more than one article`)
      continue
    }

    let buffer = null
    try {
      const response = await fetch(record.ogImage, {
        headers: { 'user-agent': 'gta6record-robot (+https://gta6record.com)' },
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error(`returned ${response.status}`)
      buffer = Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.log(`    image skipped: ${record.ogImage} did not download (${error.message})`)
      continue
    }

    let meta = null
    try {
      meta = await sharp(buffer).metadata()
    } catch {
      console.log('    image skipped: the file is not a readable picture')
      continue
    }
    if ((meta.width ?? 0) < MIN_IMAGE_WIDTH) {
      console.log(`    image skipped: ${meta.width}px wide, under ${MIN_IMAGE_WIDTH}px`)
      continue
    }

    await fs.mkdir(IMG_DIR, { recursive: true })
    await sharp(buffer).jpeg({ quality: 82 }).toFile(path.join(IMG_DIR, `${slug}.jpg`))

    const credits = await readJson(CREDITS_FILE, {})
    credits[slug] = {
      credit: `Image: ${record.outlet}. Shown for reference only.`,
      source: record.url,
      file: record.ogImage,
    }
    await writeJson(CREDITS_FILE, credits)
    console.log(`    image saved from ${record.outlet}, ${meta.width}px wide`)
    return true
  }

  return false
}

const accepted = []
const refused = []
let imagesSaved = 0

if (!hasKey && newGroups.size) {
  console.log(`entities: ${newGroups.size} candidate(s) for a new entry held, a new entry needs a model`)
}

for (const [key, records] of hasKey ? newGroups : new Map()) {
  const entityType = records[0].entityType
  const name = records[0].name
  const provisional = slugify(name)

  if (!provisional) continue
  if (alreadyHandled.has(provisional)) continue

  const outlets = new Set(records.map((record) => record.outlet))
  const official = records.filter((record) => record.tier === 'TIER_1_OFFICIAL')

  // Eligibility. One press outlet on its own is a report, not a catalog entry.
  if (!official.length && outlets.size < 2) {
    console.log(`  ${key}: not eligible, one press outlet only`)
    continue
  }

  const allClaims = records.flatMap((record) =>
    record.claims.map((claim) => ({ ...claim, outlet: record.outlet, url: record.url, published: record.published })),
  )
  const quotes = allClaims.map((claim) => claim.quote)
  const quoteBlob = quotes.join('\n')

  const best = official.length ? bestRecord(official) : bestRecord(records)

  const user = [
    `entity_type: ${entityType}`,
    `Proposed name: ${name}`,
    `Sources: ${[...outlets].join(', ')}`,
    '',
    'Verified claims. Each one is followed by the exact words the outlet published.',
    '',
    ...allClaims.map((claim, index) =>
      `${index + 1}. ${claim.fact}\n   Quote (${claim.outlet}, ${claim.published ?? 'date unknown'}): "${claim.quote}"`,
    ),
  ].join('\n')

  let written = null
  try {
    written = await ask({ system: WRITE_SYSTEM, user, model: modelFor('write'), maxTokens: 4096 })
  } catch (error) {
    console.log(`  ${key}: not written this run (${error.message})`)
    continue
  }

  const slug = slugify(written?.slug || name) || provisional

  const asList = (value) =>
    (Array.isArray(value) ? value : String(value ?? '').split(';'))
      .map((item) => String(item).trim())
      .filter(Boolean)

  let longDescription = String(written?.long_description ?? '').trim()
  let shortDescription = String(written?.short_description ?? '').trim()
  let keyFacts = asList(written?.key_facts)
  let faq = (Array.isArray(written?.faq) ? written.faq : [])
    .map((pair) => ({ q: String(pair?.q ?? '').trim(), a: String(pair?.a ?? '').trim() }))
    .filter((pair) => pair.q && pair.a)
  const notKnown = asList(written?.notKnown)

  const fail = async (reason) => {
    await refuse(slug, reason, records, written)
    refused.push(slug)
  }

  if (takenSlugs.has(slug)) {
    await fail(`slug "${slug}" is already used by an existing entry`)
    continue
  }

  const everyField = [
    shortDescription, longDescription, ...keyFacts, ...notKnown,
    ...faq.flatMap((pair) => [pair.q, pair.a]),
    String(written?.real_world_basis ?? ''), String(written?.first_shown_in ?? ''),
    ...asList(written?.search_terms), ...asList(written?.related_entities),
    String(written?.subcategory ?? ''), String(written?.category ?? ''),
  ]

  if (everyField.some(hasEmDash)) {
    await fail('an em dash appears in the written text')
    continue
  }

  const quoteNumbers = normalise(quoteBlob)
  const unbacked = everyField
    .flatMap((field) => numbersIn(field))
    .filter((number) => !quoteNumbers.includes(number))
  if (unbacked.length) {
    await fail(`the number(s) ${[...new Set(unbacked)].join(', ')} appear in the writing but in no quote`)
    continue
  }

  if (countWords(longDescription) < MIN_WORDS) {
    await fail(`long_description is ${countWords(longDescription)} words, the robot's bar is ${MIN_WORDS}`)
    continue
  }
  if (keyFacts.length < MIN_KEY_FACTS) {
    await fail(`only ${keyFacts.length} key facts, the bar is ${MIN_KEY_FACTS}`)
    continue
  }

  // The support pass. Every written sentence is put back to the model with the
  // quotes and nothing else. Whatever comes back marked unsupported is deleted,
  // and the bars are then measured again on what is left.
  const units = []
  for (const sentence of sentencesIn(longDescription)) units.push({ kind: 'long', text: sentence })
  for (const sentence of sentencesIn(shortDescription)) units.push({ kind: 'short', text: sentence })
  for (const fact of keyFacts) units.push({ kind: 'fact', text: fact })
  faq.forEach((pair, index) => {
    for (const sentence of sentencesIn(pair.a)) units.push({ kind: 'faq', index, text: sentence })
  })

  let verdicts = null
  try {
    verdicts = await ask({
      system: SUPPORT_SYSTEM,
      model: modelFor('extract'),
      maxTokens: 2048,
      user: [
        'Quotes:',
        ...quotes.map((quote, index) => `Q${index + 1}. "${quote}"`),
        '',
        'Sentences:',
        ...units.map((unit, index) => `${index + 1}. ${unit.text}`),
      ].join('\n'),
    })
  } catch (error) {
    console.log(`  ${slug}: support pass did not run (${error.message}), leaving it for the next run`)
    continue
  }

  const supported = new Map()
  for (const result of Array.isArray(verdicts?.results) ? verdicts.results : []) {
    supported.set(Number(result?.n), result?.supported === true)
  }

  // A sentence the checker did not rule on is treated as unsupported. The
  // permissive reading would let a truncated reply publish everything.
  const keepUnit = (index) => supported.get(index + 1) === true
  const dropped = units.filter((_, index) => !keepUnit(index)).length

  longDescription = units
    .map((unit, index) => (unit.kind === 'long' && keepUnit(index) ? unit.text : null))
    .filter(Boolean)
    .join(' ')
  shortDescription = units
    .map((unit, index) => (unit.kind === 'short' && keepUnit(index) ? unit.text : null))
    .filter(Boolean)
    .join(' ')
  keyFacts = units
    .map((unit, index) => (unit.kind === 'fact' && keepUnit(index) ? unit.text : null))
    .filter(Boolean)
  const faqKept = faq.map((pair) => ({ q: pair.q, a: '' }))
  units.forEach((unit, index) => {
    if (unit.kind !== 'faq' || !keepUnit(index)) return
    faqKept[unit.index].a = `${faqKept[unit.index].a} ${unit.text}`.trim()
  })
  faq = faqKept.filter((pair) => pair.a)

  if (dropped) console.log(`  ${slug}: ${dropped} of ${units.length} sentence(s) removed as unsupported`)

  if (!shortDescription) {
    await fail('no sentence of short_description survived the support pass')
    continue
  }
  if (countWords(longDescription) < MIN_WORDS) {
    await fail(`after removing unsupported sentences long_description is ${countWords(longDescription)} words, under ${MIN_WORDS}`)
    continue
  }
  if (keyFacts.length < MIN_KEY_FACTS) {
    await fail(`after removing unsupported facts only ${keyFacts.length} key fact(s) remain, under ${MIN_KEY_FACTS}`)
    continue
  }

  const isOfficial = official.length > 0
  const row = {
    entity_type: entityType,
    name: String(written?.name ?? name).trim() || name,
    alt_names: asList(written?.alt_names).join(';'),
    slug,
    category: String(written?.category ?? entityType).trim() || entityType,
    subcategory: String(written?.subcategory ?? '').trim(),
    short_description: shortDescription.slice(0, 300),
    long_description: longDescription,
    key_facts: keyFacts.join(';'),
    real_world_basis: String(written?.real_world_basis ?? '').trim(),
    first_shown_in: String(written?.first_shown_in ?? best.outlet).trim(),
    first_shown_date: String(written?.first_shown_date ?? best.published ?? '').trim(),
    confirmed_status: isOfficial ? 'OFFICIAL_CONFIRMED' : 'PRESS_REPORTED',
    source_tier: isOfficial ? 'TIER_1_OFFICIAL' : 'TIER_2_MAJOR_PRESS',
    source_url: best.url,
    source_date: best.published ?? '',
    confidence: isOfficial ? 'HIGH' : 'MEDIUM',
    official_image_exists: 'NO',
    related_entities: asList(written?.related_entities).join(';'),
    search_terms: asList(written?.search_terms).join(';'),
    notes: 'robot',
  }

  let hasImage = false
  try {
    hasImage = await fetchImage(slug, records)
  } catch (error) {
    console.log(`    image skipped: ${error.message}`)
  }
  if (hasImage) {
    row.official_image_exists = 'YES'
    imagesSaved += 1
  }

  await appendCsvRow(row)
  takenSlugs.add(slug)

  await fs.mkdir(EXTRAS_DIR, { recursive: true })
  await writeJson(path.join(EXTRAS_DIR, `${slug}.json`), {
    slug,
    faq,
    notKnown,
    howWeKnow: `This entry was built from ${[...outlets].join(' and ')}, published ${best.published ?? 'on an unstated date'}. Every sentence above was checked against the words those outlets printed, and anything that could not be traced to a quote was removed before the entry was saved.`,
  })

  accepted.push(slug)
  console.log(`  accepted ${slug} (${row.confirmed_status}, ${countWords(longDescription)} words, ${keyFacts.length} key facts)`)
}

await writeJson(LEDGER_FILE, {
  accepted: [...new Set([...(ledger.accepted ?? []), ...accepted])].sort(),
  refused: [...new Set([...(ledger.refused ?? []), ...refused])].sort(),
  updated: new Date().toISOString().slice(0, 10),
})

if (imagesSaved) {
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-images.mjs')], { stdio: 'inherit' })
  } catch (error) {
    console.log(`entities: build-images.mjs failed (${error.message})`)
  }
}

console.log('')
console.log(`entities: ${appended} fact(s) appended to entries that already exist`)
console.log(`entities: ${accepted.length} new entry/entries accepted, ${refused.length} refused`)
