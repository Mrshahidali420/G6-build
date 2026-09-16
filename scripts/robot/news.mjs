// Lane 3: write a news article from claims that already survived lane 2.
//
// Lane 1 cannot form a sentence. Lane 2 writes catalog rows. Lane 3 writes the
// only long prose on this site that a person did not type, so it is the lane
// with the most to lose, and it is built the same way as lane 2: a model is
// allowed to arrange facts and is trusted with nothing else.
//
// The model never sees an article. It sees a list of claims, each one a fact
// whose quote has already been proved to be a real run of characters from a
// saved article by scripts/robot/extract.mjs. Anything it writes that cannot be
// traced back to one of those claims is deleted before the page is written, and
// if the deletions take the page under the bars the page is refused instead.
//
// What it may do
//   Write src/content/news/<slug>.md for a story that an official source
//   covered, or that two different outlets covered, carrying at least four
//   distinct verified claims.
//
// What it may not do
//   Overwrite a page that exists. Link to a host that is not in sources.mjs.
//   Write a sentence no claim supports. Write a number no quote contains.
//   Write an em dash, an emoji or a table.
//
// Run: node scripts/robot/news.mjs
// Writes: src/content/news/<slug>.md, data/robot/news.json,
//         data/robot/refused/news-<slug>.json

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ask, hasKey, modelFor, ready } from './ai.mjs'
import {
  countWords,
  hasEmDash,
  normalise,
  numbersIn,
  sentencesIn,
  slugify,
} from './checks.mjs'
import { DATA_DIR, RAW_DIR, ROOT, readJson, today, writeJson } from './lib.mjs'
import { digestNumberSource, headlineWords, logicDraft } from './logic.mjs'
import { ALLOWED_HOSTS } from './sources.mjs'

export const CLAIMS_DIR = path.join(DATA_DIR, 'claims')
export const REFUSED_DIR = path.join(DATA_DIR, 'refused')
export const LEDGER_FILE = path.join(DATA_DIR, 'news.json')
export const NEWS_DIR = path.join(ROOT, 'src', 'content', 'news')
export const ENTITIES_JSON = path.join(ROOT, 'src', 'data', 'entities.json')

// Two items are the same story when they were published within this many days
// of each other and share this many signals, where a signal is a catalog entry
// both reports are about or a telling word both headlines use. Two reports on
// "Stephen Root" share two words and group; two that only both mention Vice
// City in passing share nothing and stay apart. The bar is deliberately dull.
// A cleverer rule would group two unrelated pieces on a busy week.
export const SHARED_SIGNALS = 2
export const STORY_DAYS = 3

export const MIN_CLAIMS = 4
export const MIN_WORDS = 250
export const TITLE_MIN = 20
export const TITLE_MAX = 90
export const DESCRIPTION_MIN = 70
export const DESCRIPTION_MAX = 160

const EMOJI = /\p{Extended_Pictographic}/u
const HEADING = /^#{1,6}\s/
const DAY_MS = 86400000

// --- reading what lane 2 left behind -----------------------------------------

/**
 * An entity the article is about, not one it mentions in passing. Logic mode
 * marks the difference with salient; a model claim has no flag and counts.
 */
export function isSalient(entity) {
  return entity?.salient !== false
}

/**
 * Every name and alt name an item is about, flattened for comparison. With
 * includeBackground the names it only mentions come too: those are no use
 * for telling stories apart, but a page may still link the entries.
 */
export function namesOf(entities, includeBackground = false) {
  const names = new Set()
  for (const entity of (entities ?? []).filter((entity) => includeBackground || isSalient(entity))) {
    for (const label of [entity?.name, ...(entity?.altNames ?? [])]) {
      const key = normalise(label)
      if (key) names.add(key)
    }
  }
  return names
}

/**
 * One item per claims file that still has its raw article on disk. A page may
 * only be built from saved text, so an item whose raw file is gone is dropped
 * exactly as lane 1 drops it.
 */
export async function loadItems({ claimsDir = CLAIMS_DIR, rawDir = RAW_DIR, ledger = {} } = {}) {
  let files = []
  try {
    files = (await fs.readdir(claimsDir)).filter((name) => name.endsWith('.json')).sort()
  } catch {
    return []
  }

  const items = []
  for (const file of files) {
    const doc = await readJson(path.join(claimsDir, file), null)
    if (!doc?.rawId) continue
    if (ledger[doc.rawId]) continue

    const raw = await readJson(path.join(rawDir, `${doc.rawId}.json`), null)
    if (!raw?.url || !raw.title) {
      console.log(`  ${doc.rawId}: skipped, its raw article is no longer on disk`)
      continue
    }

    const claims = (doc.entities ?? []).flatMap((entity) =>
      (entity.claims ?? []).map((claim) => ({
        fact: claim.fact,
        quote: claim.quote,
        outlet: raw.outlet,
        url: raw.url,
        published: raw.published ?? doc.published ?? null,
      })),
    )
    if (!claims.length) continue

    items.push({
      rawId: doc.rawId,
      outlet: raw.outlet,
      tier: raw.tier,
      url: raw.url,
      title: raw.title,
      summary: raw.summary ?? '',
      published: raw.published ?? doc.published ?? null,
      names: namesOf(doc.entities),
      mentions: namesOf(doc.entities, true),
      words: headlineWords(raw.title),
      // The names as the catalog spells them, for the digest template. names
      // above is flattened for comparison and is no use on a page.
      displayNames: [...new Set((doc.entities ?? []).filter(isSalient).map((entity) => entity?.name).filter(Boolean))],
      claims,
    })
  }

  return items.sort((a, b) => a.rawId.localeCompare(b.rawId))
}

// --- grouping, in code, with no model anywhere near it ------------------------

export function sameStory(a, b) {
  if (!a.published || !b.published) return false
  const gap = Math.abs(Date.parse(`${a.published}T00:00:00Z`) - Date.parse(`${b.published}T00:00:00Z`))
  if (!Number.isFinite(gap) || gap > STORY_DAYS * DAY_MS) return false

  let shared = 0
  for (const name of a.names) if (b.names.has(name)) shared += 1
  for (const word of a.words ?? []) if (b.words?.has(word)) shared += 1
  return shared >= SHARED_SIGNALS
}

/** Union find over the items. Same input, same grouping, every time. */
export function groupStories(items) {
  const parent = items.map((_, index) => index)
  const find = (index) => {
    let node = index
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]]
      node = parent[node]
    }
    return node
  }
  const union = (left, right) => {
    const a = find(left)
    const b = find(right)
    if (a === b) return
    parent[Math.max(a, b)] = Math.min(a, b)
  }

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (sameStory(items[i], items[j])) union(i, j)
    }
  }

  const groups = new Map()
  items.forEach((item, index) => {
    const root = find(index)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(item)
  })
  return [...groups.values()]
}

/**
 * One official source, or two different outlets. A single press outlet is a
 * report, not a record, and tomorrow a second outlet may join it, so a story
 * that fails this is left alone rather than refused.
 */
export function eligibility(story) {
  const outlets = new Set(story.map((item) => item.outlet))
  if (story.some((item) => item.tier === 'TIER_1_OFFICIAL')) return { ok: true, outlets }
  if (outlets.size >= 2) return { ok: true, outlets }
  return { ok: false, outlets, why: `only ${[...outlets].join(', ')} has covered it so far` }
}

/** Every claim in the story, one per distinct quote. */
export function distinctClaims(story) {
  const seen = new Set()
  const claims = []
  for (const item of story) {
    for (const claim of item.claims) {
      const key = normalise(claim.quote)
      if (!key || seen.has(key)) continue
      seen.add(key)
      claims.push(claim)
    }
  }
  return claims
}

export const earliestDay = (story) =>
  story
    .map((item) => item.published)
    .filter(Boolean)
    .sort()[0] ?? null

export function slugFor(title) {
  const base = slugify(title)
  if (!base) return ''
  // A headline that opens with the game's name, possessive or not, gets the
  // one fixed prefix instead of "gta-6-gta-6s-".
  const rest = base.replace(/^(gta-6|gta-vi|grand-theft-auto-vi|grand-theft-auto-6)s?(?:-|$)/, '')
  return rest ? `gta-6-${rest}` : base
}

// --- the support pass ---------------------------------------------------------

/**
 * A body split into lines the rebuild can put back together. Headings, blank
 * lines and list markers are structure, not sentences: there is no claim in a
 * marker to support. The words after a list marker are sentences like any
 * other and are checked like any other.
 */
export function splitBody(body) {
  const lines = []
  for (const raw of String(body ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim() || HEADING.test(line)) {
      lines.push({ kind: 'structure', text: line })
      continue
    }
    const marker = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)/)
    const prefix = marker ? marker[1] : ''
    lines.push({ kind: 'text', prefix, parts: sentencesIn(line.slice(prefix.length)) })
  }
  return lines
}

export function unitsOf(lines) {
  const units = []
  lines.forEach((line, lineIndex) => {
    if (line.kind !== 'text') return
    line.parts.forEach((text) => units.push({ lineIndex, text }))
  })
  return units
}

// A heading whose section lost every sentence is dropped with it. Leaving it
// behind would put a promise on the page that the page no longer keeps.
function tidy(lines) {
  const kept = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (HEADING.test(line)) {
      let hasBody = false
      for (let next = index + 1; next < lines.length; next += 1) {
        if (HEADING.test(lines[next])) break
        if (lines[next].trim()) {
          hasBody = true
          break
        }
      }
      if (!hasBody) continue
    }
    kept.push(line)
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function rebuildBody(lines, units, kept) {
  const byLine = new Map()
  units.forEach((unit, index) => {
    if (!kept.has(index)) return
    if (!byLine.has(unit.lineIndex)) byLine.set(unit.lineIndex, [])
    byLine.get(unit.lineIndex).push(unit.text)
  })

  const out = []
  lines.forEach((line, index) => {
    if (line.kind === 'structure') {
      out.push(line.text)
      return
    }
    const parts = byLine.get(index)
    if (!parts?.length) return
    out.push(`${line.prefix}${parts.join(' ')}`)
  })
  return tidy(out)
}

// --- the file ------------------------------------------------------------------

const yamlString = (value) =>
  `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export function frontmatter({ title, description, date, updated, tier, sources, related }) {
  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${yamlString(date)}`,
    `updated: ${yamlString(updated)}`,
    `tier: ${yamlString(tier)}`,
    'sources:',
  ]
  for (const source of sources) {
    lines.push(`  - label: ${yamlString(source.label)}`)
    lines.push(`    url: ${yamlString(source.url)}`)
  }
  if (related.length) {
    lines.push('related:')
    for (const slug of related) lines.push(`  - ${yamlString(slug)}`)
  } else {
    lines.push('related: []')
  }
  lines.push('---')
  return lines.join('\n')
}

export const pageText = (meta, body) => `${frontmatter(meta)}\n\n${body}\n`

// --- prompts -------------------------------------------------------------------

const WRITE_SYSTEM = [
  'You write one news article for a factual record of Grand Theft Auto VI.',
  '',
  'You are given a list of verified claims. Each claim carries the exact words an outlet',
  'published. Those quotes are the entire world of facts you have. You have no background',
  'knowledge of this game and you may not use any.',
  '',
  'Absolute rules:',
  '- Every sentence you write must be supported by one of the claims. If you cannot support it, do not write it.',
  '- Never invent a date, a price, a name, a platform, a mission, a voice actor or a number.',
  '- Every number you write must appear in one of the quotes, written the same way.',
  '- Attribute a reported fact to the outlet in the sentence, for example "GameSpot reports that".',
  '- No em dash anywhere. Use a comma, a full stop or a colon.',
  '- No emoji. No tables. No speculation. No adjectives about excitement: no "iconic", no "highly',
  '  anticipated", no "stunning", no "beloved", no "long awaited".',
  '- Plain English, short sentences. This is a public record, not a blog post.',
  '- Write "Grand Theft Auto VI" on first mention, "GTA 6" after that.',
  '- Never claim this site has played the game or seen anything first hand.',
  '',
  'Shape of the body:',
  '- Markdown. Sections start with "## ". No level one heading, the title is the page heading.',
  '- The first section is exactly "## The short answer", two or three sentences that answer the story.',
  '- Then two to five more sections, each one a plain heading a reader would search for.',
  `- At least ${MIN_WORDS} words in total.`,
  '',
  `title is ${TITLE_MIN} to ${TITLE_MAX} characters and says what happened.`,
  `description is ${DESCRIPTION_MIN} to ${DESCRIPTION_MAX} characters, one plain sentence, no hype.`,
  'relatedNames are the names of things this story is about, copied from the names you were given.',
  '',
  'Return JSON only, exactly this shape:',
  '{"title":"","description":"","body":"","relatedNames":[]}',
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

// --- run ------------------------------------------------------------------------

async function relatedIndex() {
  const catalog = await readJson(ENTITIES_JSON, [])
  const index = new Map()
  for (const entity of Array.isArray(catalog) ? catalog : []) {
    for (const label of [entity.name, entity.slug, ...(entity.altNames ?? [])]) {
      const key = normalise(label)
      if (key && !index.has(key)) index.set(key, entity.slug)
    }
  }
  return index
}

async function refuse(refusedDir, name, reason, claims, written) {
  await fs.mkdir(refusedDir, { recursive: true })
  const slug = `news-${name}`
  await writeJson(path.join(refusedDir, `${slug}.json`), {
    slug,
    reason,
    refusedAt: today(),
    written: written ?? null,
    claims,
  })
  console.log(`  refused ${slug}: ${reason}`)
  return slug
}

/**
 * The model attempt: one call to write the page, then the support pass that
 * deletes every sentence the quotes do not carry. A failure here is never a
 * refusal on its own, because the quote digest is always underneath it.
 */
async function modelDraft({ askFn, outlets, storyNames, claims, quotes }) {
  const user = [
    `Outlets: ${[...outlets].join(', ')}`,
    `Names in this story: ${storyNames.join(', ')}`,
    '',
    'Verified claims. Each one is followed by the exact words the outlet published.',
    '',
    ...claims.map(
      (claim, index) =>
        `${index + 1}. ${claim.fact}\n   Quote (${claim.outlet}, ${claim.published ?? 'date unknown'}): "${claim.quote}"`,
    ),
  ].join('\n')

  let draft = null
  try {
    draft = await askFn({ system: WRITE_SYSTEM, user, model: modelFor('write'), maxTokens: 4096 })
  } catch (error) {
    return { why: `the model did not write this story (${error.message})` }
  }

  const title = String(draft?.title ?? '').trim()
  const description = String(draft?.description ?? '').trim()
  const body = String(draft?.body ?? '').replace(/\r\n/g, '\n').trim()
  if (body.split('\n').some((line) => line.trim().startsWith('|'))) {
    return { why: 'the model wrote a table, which the support pass cannot check sentence by sentence' }
  }

  const lines = splitBody(body)
  const units = unitsOf(lines)
  if (!units.length) return { why: 'the model wrote no sentences' }

  let verdicts = null
  try {
    verdicts = await askFn({
      system: SUPPORT_SYSTEM,
      model: modelFor('extract'),
      maxTokens: 4096,
      user: [
        'Quotes:',
        ...quotes.map((quote, index) => `Q${index + 1}. "${quote}"`),
        '',
        'Sentences:',
        ...units.map((unit, index) => `${index + 1}. ${unit.text}`),
      ].join('\n'),
    })
  } catch (error) {
    return { why: `the support pass did not run (${error.message})` }
  }

  // A sentence the checker did not rule on counts as unsupported. The
  // permissive reading would let a truncated reply publish everything.
  const kept = new Set()
  for (const result of Array.isArray(verdicts?.results) ? verdicts.results : []) {
    const index = Number(result?.n) - 1
    if (result?.supported === true && index >= 0 && index < units.length) kept.add(index)
  }
  const dropped = units.length - kept.size
  if (dropped) console.log(`  ${dropped} of ${units.length} model sentence(s) removed as unsupported`)

  return {
    title,
    description,
    body: rebuildBody(lines, units, kept),
    relatedNames: Array.isArray(draft?.relatedNames) ? draft.relatedNames : [],
    raw: draft,
  }
}

/**
 * Every gate that does not need a model. Both drafts go through all of it.
 * `hold` says a later run may do better, which is true whenever the data was
 * simply too thin: another outlet may join the story tomorrow.
 */
async function gate({ draft, quoteHaystack, sources, ledger, newsDir, name }) {
  const { title, description, body } = draft
  const thin = (why) => ({ ok: false, why, hold: true })
  const bad = (why) => ({ ok: false, why, hold: false })

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return thin(`the title is ${title.length} characters, the bar is ${TITLE_MIN} to ${TITLE_MAX}`)
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    return thin(
      `the description is ${description.length} characters, the bar is ${DESCRIPTION_MIN} to ${DESCRIPTION_MAX}`,
    )
  }
  if ([title, description, body].some(hasEmDash)) return bad('an em dash appears in the written text')
  if ([title, description, body].some((value) => EMOJI.test(value))) {
    return bad('an emoji appears in the written text')
  }
  if (body.split('\n').some((line) => line.trim().startsWith('|'))) {
    return bad('the body holds a table, which the support pass cannot check sentence by sentence')
  }
  if (countWords(body) < MIN_WORDS) {
    return thin(`the body is ${countWords(body)} words, under ${MIN_WORDS}`)
  }

  const unbacked = [...new Set([...numbersIn(body), ...numbersIn(title), ...numbersIn(description)])]
    .filter((number) => !quoteHaystack.includes(number))
  if (unbacked.length) {
    return bad(`the number(s) ${unbacked.join(', ')} appear in the writing but in no quote`)
  }

  const file = path.join(newsDir, `${name}.md`)
  const slugTaken = await fs.access(file).then(() => true).catch(() => false)
  if (slugTaken || Object.values(ledger).some((entry) => entry?.slug === name)) {
    return bad(`the slug "${name}" is already used by a news page`)
  }

  const offHost = sources.filter((source) => {
    try {
      return !ALLOWED_HOSTS.has(new URL(source.url).hostname)
    } catch {
      return true
    }
  })
  if (offHost.length) return bad(`the source ${offHost[0].url} is not on the allowed host list`)

  return { ok: true, file }
}

// Every path is an option so the test can run the real writer against a
// fixture directory. In a real run they are the constants above, and nothing
// outside this file passes anything else.
export async function run({
  askFn = ask,
  isReady = ready,
  hasModel = hasKey,
  claimsDir = CLAIMS_DIR,
  rawDir = RAW_DIR,
  newsDir = NEWS_DIR,
  refusedDir = REFUSED_DIR,
  ledgerFile = LEDGER_FILE,
} = {}) {
  const useModel = Boolean(hasModel) && Boolean(isReady())
  if (!useModel) console.log('news: no AI key, writing quote digests from the saved reports')

  const ledger = await readJson(ledgerFile, {})
  const items = await loadItems({ claimsDir, rawDir, ledger })
  if (!items.length) {
    console.log('news: no unwritten claim files, nothing to do')
    return { written: [], refused: [] }
  }

  const stories = groupStories(items)
  console.log(`news: ${items.length} unwritten item(s), ${stories.length} story/stories`)

  const catalog = await relatedIndex()
  const written = []
  const refused = []

  for (const story of stories) {
    const key = story.map((item) => item.rawId).join(', ')
    const { ok, outlets, why } = eligibility(story)
    if (!ok) {
      console.log(`  ${key}: held, ${why}. An outlet may join it tomorrow.`)
      continue
    }

    const claims = distinctClaims(story)
    if (claims.length < MIN_CLAIMS) {
      console.log(`  ${key}: held, ${claims.length} distinct claim(s), the bar is ${MIN_CLAIMS}`)
      continue
    }

    const date = earliestDay(story)
    if (!date) {
      console.log(`  ${key}: held, no item carries a published date`)
      continue
    }

    const storyNames = [...new Set(story.flatMap((item) => [...(item.mentions ?? item.names)]))]
    const quotes = claims.map((claim) => claim.quote)
    const quoteBlob = normalise(quotes.join('\n'))
    const digestBlob = normalise(digestNumberSource(story, quotes))
    const sources = story.map((item) => ({ label: `${item.outlet}: ${item.title}`, url: item.url }))

    let page = null
    let draft = null
    let hold = null
    let refusal = null

    for (const via of useModel ? ['model', 'logic'] : ['logic']) {
      const built =
        via === 'model'
          ? await modelDraft({ askFn, outlets, storyNames, claims, quotes })
          : logicDraft(story, claims, story, { catalog })

      const blocked = built.why ?? built.held
      if (blocked) {
        if (via === 'model') {
          console.log(`  ${key}: ${blocked}, falling back to the logic digest`)
          continue
        }
        hold = blocked
        break
      }

      const name = slugFor(built.title) || story[0].rawId
      const verdict = await gate({
        draft: built,
        quoteHaystack: via === 'model' ? quoteBlob : digestBlob,
        sources,
        ledger,
        newsDir,
        name,
      })

      if (verdict.ok) {
        page = { ...verdict, name, via }
        draft = built
        break
      }
      if (via === 'model') {
        console.log(`  ${key}: ${verdict.why}, falling back to the logic digest`)
        continue
      }
      draft = built
      if (verdict.hold) hold = verdict.why
      else refusal = verdict.why
    }

    if (!page) {
      if (!refusal) {
        console.log(`  ${key}: held, ${hold ?? 'the data does not fill the template yet'}`)
        continue
      }
      const name = slugFor(draft?.title ?? '') || story[0].rawId
      refused.push(await refuse(refusedDir, name, refusal, claims, draft?.raw ?? draft ?? null))
      for (const item of story) {
        ledger[item.rawId] = { slug: null, written: null, refused: today(), reason: refusal }
      }
      continue
    }

    const wanted = new Set(
      [...(draft.relatedNames ?? []), ...storyNames].map((value) => normalise(value)).filter(Boolean),
    )
    const related = [...new Set([...wanted].map((value) => catalog.get(value)).filter(Boolean))].sort()

    const meta = {
      title: draft.title,
      description: draft.description,
      date,
      updated: today(),
      tier: story.some((item) => item.tier === 'TIER_1_OFFICIAL') ? 'TIER_1_OFFICIAL' : 'TIER_2_MAJOR_PRESS',
      sources,
      related,
    }

    await fs.mkdir(newsDir, { recursive: true })
    await fs.writeFile(page.file, pageText(meta, draft.body), 'utf8')
    for (const item of story) ledger[item.rawId] = { slug: page.name, written: today() }
    written.push(page.name)
    console.log(
      `  wrote ${page.name} by ${page.via} (${meta.tier}, ${countWords(draft.body)} words, ` +
        `${sources.length} source(s), ${related.length} related)`,
    )
  }

  await writeJson(ledgerFile, ledger)

  console.log('')
  console.log(`news: ${written.length} article(s) written, ${refused.length} refused`)
  return { written, refused }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) await run()
