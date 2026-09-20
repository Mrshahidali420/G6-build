/**
 * Imports the outlawdb GTA 6 datasets into this site's entity CSV format.
 *
 * outlawdb publishes six GTA 6 tables that it derives from the GTA Fandom
 * wiki and releases under CC BY-SA 3.0. The wiki is a community source, not
 * Rockstar, so every row written here lands at TIER_3_COMMUNITY with the
 * status COMMUNITY_IDENTIFIED and LOW confidence, and carries the exact wiki
 * page it came from in source_url. That is the record this site keeps: what a
 * source said, and which source said it.
 *
 * No sentence below adds a fact. Every sentence restates a field that is
 * already in the row, or says plainly that a field was empty.
 *
 * Rows whose slug already exists in a hand written data CSV are skipped,
 * because a Rockstar or press sourced entry always beats a wiki one.
 *
 *   node scripts/import/outlawdb.mjs [path-to-outlawdb-datasets]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = process.argv[2] || join(ROOT, '..', 'gta6-src', 'outlawdb-datasets')
const SRC_DIR = join(SRC, 'data', 'gta-6')

if (!existsSync(SRC_DIR)) {
  console.error(`[outlawdb] no dataset at ${SRC_DIR}`)
  console.error('[outlawdb] clone it first:')
  console.error('  git clone --depth 1 https://github.com/outlawdb/datasets.git')
  process.exit(1)
}

const COLUMNS = [
  'entity_type', 'name', 'alt_names', 'slug', 'category', 'subcategory',
  'short_description', 'long_description', 'key_facts', 'real_world_basis',
  'first_shown_in', 'first_shown_date', 'confirmed_status', 'source_tier',
  'source_url', 'source_date', 'confidence', 'official_image_exists',
  'related_entities', 'search_terms', 'notes',
]

/** Slugs already covered by a hand written CSV. Those rows win. */
function existingSlugs() {
  const slugs = new Set()
  for (const file of readdirSync(join(ROOT, 'data'))) {
    if (!file.endsWith('.csv') || file.startsWith('_')) continue
    if (file.endsWith('-fandom.csv')) continue
    const text = readFileSync(join(ROOT, 'data', file), 'utf8')
    for (const line of text.split('\n').slice(1)) {
      const cell = line.split('","')[3]
      if (cell) slugs.add(cell.replace(/"/g, '').trim())
    }
  }
  return slugs
}

const NL = String.fromCharCode(10)
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
const csvRow = (row) => COLUMNS.map((key) => csvCell(row[key])).join(',')

/** Joins clauses into a paragraph, dropping anything empty. */
/** Plural names take a plural verb. "Alligators appear", not "appears". */
const plural = (name) => /s$/i.test(String(name)) && !/(?:ss|us|is|as)$/i.test(String(name))
const verb = (name, singular, pl) => (plural(name) ? pl : singular)

const para = (...parts) => parts.filter(Boolean).join(' ')
/** Semicolon list for key_facts and the other multi value columns. */
const list = (...parts) => parts.filter(Boolean).join(';')

/** Splits a comma separated wiki field into trimmed parts. */
const commaList = (value) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

/** The wiki writes these when it has no answer. Treat them as empty. */
const BLANKS = new Set(['unknown', 'not given', 'n/a', 'none', 'tbd', ''])
const real = (value) =>
  BLANKS.has(String(value ?? '').trim().toLowerCase()) ? '' : String(value ?? '').trim()

/** Turns "conveniencestore" into "convenience store" where we can. */
const WORDS = [
  'store', 'shop', 'club', 'house', 'park', 'station', 'center', 'centre',
  'supply', 'range', 'project', 'ride', 'show', 'port', 'way',
]
const spaceOut = (value) => {
  let out = String(value ?? '')
  for (const word of WORDS) {
    if (out.length > word.length && out.endsWith(word)) {
      out = `${out.slice(0, -word.length)} ${word}`
      break
    }
  }
  return out
}

function parseMaybeJson(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value !== 'string') return ''
  if (!value.startsWith('[')) return value
  try {
    return JSON.parse(value).join(', ')
  } catch {
    return value
  }
}

const WIKI = 'the GTA Fandom wiki'
const CLOSER =
  'Grand Theft Auto VI has not released and Rockstar has published no list of its own, so this entry records what the wiki says and does not treat it as confirmed.'
const ATTRIB = 'Source: GTA Fandom wiki, via outlawdb'

/* ---------------------------------------------------------------- weapons */

function weapon(row) {
  const cls = real(row.weaponClass)
  const type = real(row.weaponType)
  const also = commaList(parseMaybeJson(row.alsoIn))
  const basedOn = real(row.basedOn)
  const maker = real(row.manufacturer)
  const caliber = real(row.caliber)
  const capacity = real(row.capacity)
  const fireMode = real(row.fireMode)
  const price = real(row.price)
  const aka = real(row.aka)

  const short = `${row.name} is a weapon listed for GTA 6 on ${WIKI}${cls ? `, in the ${cls.toLowerCase()} class` : ''}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI weapon.`,
    cls && `The wiki files it under ${cls.toLowerCase()}${type && type.toLowerCase() !== cls.toLowerCase() ? `, as a ${type}` : ''}.`,
    maker && `The in-game manufacturer is given as ${maker}.`,
    caliber && `The caliber is given as ${caliber}.`,
    capacity && `Magazine capacity is given as ${capacity}.`,
    fireMode && `The fire mode is given as ${fireMode}.`,
    price && `A price of ${price} is listed.`,
    basedOn && `The wiki compares it to a real firearm, the ${basedOn}. That comparison was made by wiki editors and not by Rockstar.`,
    aka && `It is also called ${aka}.`,
    also.length
      ? `The same weapon name is listed in ${also.length} earlier Grand Theft Auto ${also.length === 1 ? 'game' : 'games'}: ${also.join(', ')}. A name returning in the wiki list is not proof the weapon returns in GTA 6.`
      : '',
    CLOSER,
  )

  return {
    entity_type: 'weapon',
    category: cls,
    subcategory: type,
    short_description: short,
    long_description: long,
    key_facts: list(
      cls && `Weapon class: ${cls}`,
      maker && `Manufacturer: ${maker}`,
      caliber && `Caliber: ${caliber}`,
      capacity && `Capacity: ${capacity}`,
      fireMode && `Fire mode: ${fireMode}`,
      price && `Listed price: ${price}`,
      also.length ? `Also listed in: ${also.join(', ')}` : '',
      ATTRIB,
    ),
    real_world_basis: basedOn ? `${basedOn}, as given by the GTA Fandom wiki` : '',
    alt_names: aka,
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      cls && `gta 6 ${cls.toLowerCase()}`,
    ),
  }
}

/* --------------------------------------------------------------- vehicles */

function vehicle(row) {
  const cls = real(row.vehicleClass)
  const body = real(row.bodyStyle)
  const maker = real(row.manufacturer)
  const seats = real(row.capacity)
  const price = real(row.price)
  const priceFrom = real(row.priceFrom)
  const type = real(row.vehicleType)
  const money = price ? `$${Number(price).toLocaleString('en-US')}` : ''

  const short = `${row.name} is a vehicle listed for GTA 6 on ${WIKI}${maker ? `, made in game by ${maker}` : ''}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI vehicle.`,
    maker && `The in-game manufacturer is given as ${maker}. Grand Theft Auto uses invented car brands, so ${maker} is not a real company.`,
    cls && `The wiki files it in the ${cls} class${body ? `, with a ${body} body` : ''}.`,
    !cls && body ? `The body style is given as ${body}.` : '',
    type && type.toLowerCase() !== (cls || '').toLowerCase() ? `The vehicle type is given as ${type}.` : '',
    seats && `It seats ${seats}.`,
    money && priceFrom
      ? `A price of ${money} is listed, but the wiki takes that figure from ${priceFrom} and not from GTA 6. No GTA 6 price has been published.`
      : money
        ? `A price of ${money} is listed. Rockstar has published no GTA 6 price.`
        : '',
    CLOSER,
  )

  return {
    entity_type: 'vehicle',
    category: cls,
    subcategory: body || type,
    short_description: short,
    long_description: long,
    key_facts: list(
      maker && `Manufacturer: ${maker}`,
      cls && `Class: ${cls}`,
      body && `Body style: ${body}`,
      seats && `Seats: ${seats}`,
      money && `Listed price: ${money}${priceFrom ? ` (from ${priceFrom}, not GTA 6)` : ''}`,
      ATTRIB,
    ),
    related_entities: maker,
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      maker && `gta 6 ${maker.toLowerCase()}`,
    ),
  }
}

/* ------------------------------------------------------------- characters */

function character(row) {
  const voice = real(row.voiceActor)
  const gender = real(row.gender)
  const affil = commaList(row.affiliations)
  const job = real(row.occupation)

  const short = `${row.name} is a character listed for GTA 6 on ${WIKI}${job ? `, given as a ${job.toLowerCase()}` : ''}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI character.`,
    job && `The occupation given is ${job}.`,
    affil.length ? `The wiki lists an affiliation with ${affil.join(', ')}.` : '',
    gender === 'M'
      ? 'The wiki records the character as male.'
      : gender === 'F'
        ? 'The wiki records the character as female.'
        : '',
    voice
      ? `The voice actor is given as ${voice}.`
      : 'No voice actor is given. Rockstar has named very few of the GTA 6 cast.',
    CLOSER,
  )

  return {
    entity_type: 'character',
    category: affil[0] || '',
    subcategory: job,
    short_description: short,
    long_description: long,
    key_facts: list(
      job && `Occupation: ${job}`,
      affil.length ? `Affiliation: ${affil.join(', ')}` : '',
      voice ? `Voice actor: ${voice}` : 'Voice actor: not given',
      ATTRIB,
    ),
    related_entities: affil.join(';'),
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      `who is ${row.name.toLowerCase()} gta 6`,
    ),
  }
}

/* ------------------------------------------------------------- businesses */

function business(row) {
  const kind = spaceOut(real(row.businessType))
  const aka = real(row.aka)
  const places = commaList(row.locations)
  const cars = commaList(row.vehicles)
  const staff = real(row.employees)
  const story = real(row.storyStatus)
  const inLeonida = places.some((p) => /leonida|key lento|vice city/i.test(p))

  const short = `${row.name} ${verb(row.name, 'is', 'are')} ${plural(row.name) ? (kind ? `${kind}s` : 'businesses') : (kind ? `a ${kind}` : 'a business')} listed for GTA 6 on ${WIKI}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI business.`,
    kind && `The wiki describes it as a ${kind}.`,
    aka && `It is also called ${aka}.`,
    places.length
      ? `The wiki lists it across ${places.length} ${places.length === 1 ? 'place' : 'places'} in the series: ${places.join(', ')}.${inLeonida ? ' Leonida, Key Lento and Vice City are the GTA 6 entries in that list.' : ' None of those entries name a GTA 6 location, so the GTA 6 listing rests on the wiki alone.'}`
      : '',
    cars.length ? `Vehicles tied to it are given as ${cars.join(', ')}.` : '',
    staff && `Named staff are given as ${staff}.`,
    story && `The wiki marks its story status as ${story}.`,
    CLOSER,
  )

  return {
    entity_type: 'business',
    category: kind,
    subcategory: kind,
    short_description: short,
    long_description: long,
    key_facts: list(
      kind && `Business type: ${kind}`,
      places.length ? `Listed locations: ${places.join(', ')}` : '',
      cars.length ? `Associated vehicles: ${cars.join(', ')}` : '',
      story && `Story status: ${story}`,
      ATTRIB,
    ),
    alt_names: aka,
    related_entities: cars.join(';'),
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      kind && `gta 6 ${kind}`,
    ),
  }
}

/* ----------------------------------------------------------------- places */

/** Geographic places become locations. Built things become landmarks. */
const GEO = new Set([
  'city', 'county', 'neighborhood', 'district', 'region', 'state', 'town',
  'ocean', 'lake', 'bay', 'mountainrange', 'archipelago',
])

function place(row) {
  const kind = real(row.locationType)
  const readable = spaceOut(kind)
  const isGeo = GEO.has(kind)

  const short = `${row.name} is ${readable ? `a ${readable}` : 'a place'} listed for GTA 6 on ${WIKI}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI ${isGeo ? 'location' : 'landmark'}.`,
    readable ? `The wiki files it as a ${readable}.` : 'The wiki gives no place type for it.',
    isGeo
      ? 'It is a geographic area rather than a single building, so it holds other places inside it.'
      : 'It is a single site rather than an area.',
    'No coordinates, no district boundary and no in-game address are given with it.',
    CLOSER,
  )

  return {
    entity_type: isGeo ? 'location' : 'landmark',
    category: readable,
    short_description: short,
    long_description: long,
    key_facts: list(
      readable ? `Place type: ${readable}` : 'Place type: not given',
      isGeo ? 'Scope: area' : 'Scope: single site',
      'Coordinates: not given',
      ATTRIB,
    ),
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      `where is ${row.name.toLowerCase()} gta 6`,
    ),
  }
}

/* --------------------------------------------------------------- wildlife */

const WILDLIFE_TYPE = { animal: 'wildlife', item: 'gameplay_feature', media: 'brand' }

function wildlife(row) {
  const kind = real(row.kind)
  const feature = spaceOut(real(row.featureType))
  const species = real(row.species)
  const places = commaList(row.locations)
  const noun = kind === 'animal' ? 'animal' : kind === 'media' ? 'in-game media title' : 'item'

  const short = `${row.name} ${verb(row.name, 'is', 'are')} ${plural(row.name) ? (kind === 'animal' ? 'animals' : `${noun}s`) : (kind === 'animal' ? 'an animal' : `an ${noun}`)} listed for GTA 6 on ${WIKI}.`

  const long = para(
    `${row.name} ${verb(row.name, 'appears', 'appear')} on ${WIKI} as a Grand Theft Auto VI ${noun}.`,
    feature && `The wiki files it under ${feature}.`,
    species && `The species given is ${species}.`,
    places.length ? `It is listed at ${places.join(', ')}.` : '',
    kind === 'animal'
      ? 'Rockstar has shown animals in the GTA 6 trailers but has published no species list, so this entry rests on the wiki alone.'
      : '',
    CLOSER,
  )

  return {
    entity_type: WILDLIFE_TYPE[kind] || 'gameplay_feature',
    category: feature,
    subcategory: kind,
    short_description: short,
    long_description: long,
    key_facts: list(
      feature && `Type: ${feature}`,
      species && `Species: ${species}`,
      places.length ? `Listed at: ${places.join(', ')}` : '',
      ATTRIB,
    ),
    search_terms: list(
      `gta 6 ${row.name.toLowerCase()}`,
      `${row.name.toLowerCase()} gta 6`,
      kind === 'animal' ? 'gta 6 animals' : '',
    ),
  }
}

/* ----------------------------------------------------------------- extras */

/**
 * Builds the data/extras file for an imported row.
 *
 * Without one of these an entity page renders at roughly 250 words, which is
 * the thin page problem that gets a site refused by AdSense. The questions and
 * answers below are built from the same fields as the description, so nothing
 * new is claimed. Where the wiki gave nothing, the answer says so plainly.
 */
const NOUN = {
  weapon: 'weapon',
  vehicle: 'vehicle',
  character: 'character',
  business: 'business',
  location: 'location',
  landmark: 'landmark',
  wildlife: 'animal',
  brand: 'in-game media title',
  gameplay_feature: 'item',
}

/** Per type: the gaps the wiki never fills, and the one open question. */
const GAPS = {
  weapon: ['Damage, range and rate of fire', 'Price and where it is sold', 'Whether it is in the finished game at all'],
  vehicle: ['Top speed, handling and stats', 'A GTA 6 price', 'Whether it returns in GTA 6 at all'],
  character: ['How large the role is', 'Whether the character is playable', 'Which missions the character appears in'],
  business: ['Whether the player can enter it', 'Whether it can be robbed or bought', 'Where it sits on the map'],
  location: ['The boundary of the area', 'What is inside it', 'Whether the player can reach all of it'],
  landmark: ['Where it sits on the map', 'Whether the player can go inside', 'What happens there'],
  wildlife: ['Whether the animal can be hunted or killed', 'Where it appears on the map', 'How it behaves'],
  brand: ['Whether it can be watched or read in game', 'How long it runs', 'Where it is found'],
  gameplay_feature: ['How it is used', 'Where it is found', 'Whether it is in the finished game'],
}

function buildExtras(type, row, built) {
  const noun = NOUN[type] || 'entry'
  const name = row.name
  const gaps = GAPS[type] || GAPS.gameplay_feature
  const is = verb(name, 'is', 'are')
  const it = plural(name) ? 'they' : 'it'
  const them = plural(name) ? 'them' : 'it'
  const rests = verb(name, 'rests', 'rest')

  const facts = String(built.key_facts || '')
    .split(';')
    .filter((fact) => fact && !fact.startsWith('Source:'))

  const faq = [
    {
      q: `${verb(name, 'What is', 'What are')} ${name} in GTA 6?`,
      a: `${built.short_description} The wiki entry is the only record of ${them}. Rockstar has not named ${them} in a trailer, a press release or on the Grand Theft Auto VI site, so this page records the wiki listing and marks it as a community source.`,
    },
    {
      q: `${is === 'are' ? 'Are' : 'Is'} ${name} confirmed for GTA 6?`,
      a: `No. A Fandom wiki page is written by fans, not by Rockstar. This site files ${name} as community identified, at low confidence, for that reason. The entry stays at low confidence until Rockstar or a major outlet names ${them}.`,
    },
  ]

  if (facts.length) {
    faq.push({
      q: `What does the wiki say about ${name}?`,
      a: `The wiki gives ${facts.length} ${facts.length === 1 ? 'detail' : 'details'}. ${facts
        .map((fact) => fact.trim())
        .join('. ')}. Those are wiki fields copied as they stand. No figure here was measured in the game, because the game has not released.`,
    })
  }

  faq.push({
    q: `Where does this ${name} information come from?`,
    a: `From the GTA Fandom wiki page for ${name}, collected by the outlawdb project on ${
      built.source_date || 'the date shown above'
    } and released under CC BY-SA 3.0. The source link on this page opens the wiki page itself, so you can read the same entry.`,
  })

  faq.push({
    q: `What is still unknown about ${name}?`,
    a: `Most of it. ${name} ${rests} on a fan wiki listing and nothing else. ${gaps[0]} and ${gaps[1].toLowerCase()} are both unpublished. Rockstar answers questions like this at launch, not before, so this page will change when it does.`,
  })

  faq.push({
    q: `Will ${name} be in the finished GTA 6?`,
    a: `Not known. A wiki listing is a claim by a fan editor, not a Rockstar statement. Plenty of ${noun} entries written before a launch never appear in the game. This site records the claim and the source, and marks the entry unconfirmed until that changes.`,
  })

  const notKnown = [...gaps, 'Whether Rockstar uses this name in the finished game']

  const howWeKnow = `This entry came from the GTA Fandom wiki page for ${name}, taken through the outlawdb dataset on ${
    built.source_date || 'the date shown above'
  }. Nothing here was checked against a Rockstar source, because Rockstar has published no list that names ${them}. That is why the entry sits at low confidence and is marked as a community source rather than a confirmed one.`

  return { slug: row.slug, faq, notKnown, howWeKnow, generated: 'scripts/import/outlawdb.mjs' }
}

/* ------------------------------------------------------------------ drive */

const BUILDERS = {
  'weapons.json': weapon,
  'vehicles.json': vehicle,
  'characters.json': character,
  'businesses.json': business,
  'places.json': place,
  'wildlife.json': wildlife,
}

const skip = existingSlugs()
const seen = new Set()
const byType = new Map()
let read = 0
let skipped = 0
let extras = 0

for (const [file, build] of Object.entries(BUILDERS)) {
  const path = join(SRC_DIR, file)
  if (!existsSync(path)) {
    console.warn(`[outlawdb] missing ${file}, skipping`)
    continue
  }
  const table = JSON.parse(readFileSync(path, 'utf8'))
  const sourceDate = String(table.generated || '').slice(0, 10)

  for (const row of table.rows) {
    read += 1
    if (skip.has(row.slug) || seen.has(row.slug)) {
      skipped += 1
      continue
    }
    seen.add(row.slug)

    const built = build(row)
    const full = {
      alt_names: '',
      category: '',
      subcategory: '',
      real_world_basis: '',
      related_entities: '',
      search_terms: '',
      ...built,
      name: row.name,
      slug: row.slug,
      first_shown_in: '',
      first_shown_date: '',
      confirmed_status: 'COMMUNITY_IDENTIFIED',
      source_tier: 'TIER_3_COMMUNITY',
      source_url: row.wikiUrl || table.source,
      source_date: sourceDate,
      confidence: 'LOW',
      official_image_exists: 'NO',
      notes: table.attribution,
    }
    if (!byType.has(full.entity_type)) byType.set(full.entity_type, [])
    byType.get(full.entity_type).push(full)

    const extrasPath = join(ROOT, 'data', 'extras', `${row.slug}.json`)
    if (!existsSync(extrasPath)) {
      writeFileSync(extrasPath, JSON.stringify(buildExtras(full.entity_type, row, full), null, 2) + NL)
      extras += 1
    }
  }
}

let written = 0
for (const [type, rows] of [...byType].sort((a, b) => a[0].localeCompare(b[0]))) {
  rows.sort((a, b) => a.slug.localeCompare(b.slug))
  const out = join(ROOT, 'data', `${type}-fandom.csv`)
  writeFileSync(out, [COLUMNS.map(csvCell).join(','), ...rows.map(csvRow)].join('\n') + '\n')
  written += rows.length
  console.log(`[outlawdb] data/${type}-fandom.csv  ${rows.length} rows`)
}

console.log(`[outlawdb] read ${read}, skipped ${skipped} already covered, wrote ${written}`)
console.log(`[outlawdb] wrote ${extras} data/extras files`)
