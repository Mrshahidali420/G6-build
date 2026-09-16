// The floor of lanes 2 and 3: everything the robot can do with no model at all.
//
// Every free model provider has failed at some point, and a record that stops
// recording when a key expires is not a record. So the deterministic path is
// the floor and a model, when one answers, is a bonus that adds on top.
//
// Nothing in this file can invent a fact. A claim is a whole sentence copied
// out of a saved article. A page is a template holding names, outlet names,
// dates and links that came from the data, with every fact inside a blockquote
// that is a verbatim run of characters from the saved article it links to.
//
// There is no model call in this file and there never should be.

import { hasEmDash, normalise, sentencesIn } from './checks.mjs'
import { MATCH } from './sources.mjs'

// A label shorter than this matches too much to be worth anything. "Vin" would
// hit "vinyl", and a two letter alt name would hit half the article.
export const MIN_LABEL_LENGTH = 4

// Labels that are ordinary English before they are anything in this game. A
// catalog entry called "Beach" would otherwise claim every sentence that
// mentions a beach. The list is small on purpose: it only holds words a person
// would use without meaning the catalog entry at all.
export const LABEL_STOPLIST = new Set([
  'the', 'and', 'for', 'new', 'one', 'day', 'night', 'city', 'beach', 'north',
  'south', 'east', 'west', 'state', 'park', 'road', 'street', 'keys', 'key',
  'port', 'bay', 'island', 'lake', 'river', 'hotel', 'club', 'bar', 'gun',
  'car', 'boat', 'plane', 'bike', 'cash', 'money', 'music', 'radio', 'phone',
  'police', 'game', 'games', 'online', 'story', 'mode', 'trailer', 'edition',
  'standard', 'ultimate',
])

// Headline words that say nothing about which story a report is. Every GTA 6
// headline holds the game's name and most hold the publisher's, so those
// would make every pair of reports look like one story.
export const HEADLINE_STOPLIST = new Set([
  'grand', 'theft', 'auto', 'rockstar', 'games', 'game', 'gaming', 'take', 'two',
  'interactive', 'news', 'report', 'reports', 'reported', 'says', 'said', 'will',
  'with', 'that', 'this', 'from', 'have', 'been', 'than', 'more', 'into', 'about',
  'after', 'before', 'over', 'under', 'here', 'there', 'their', 'they', 'your',
  'what', 'when', 'where', 'which', 'while', 'just', 'only', 'even', 'also',
  'like', 'some', 'most', 'much', 'many', 'very', 'still', 'again', 'first',
  'last', 'next', 'other', 'every', 'thing', 'things', 'could', 'would', 'should',
  'might', 'does', 'want', 'wants', 'make', 'makes', 'made', 'gets', 'gives',
  'year', 'years', 'week', 'weeks', 'today', 'time', 'release', 'launch',
  'trailer', 'trailers', 'fans', 'players', 'video', 'videos', 'look', 'looks',
  'ever', 'huge', 'massive', 'major', 'best', 'ways', 'because',
])

/**
 * The words in a headline that could tell one story from another: lower case,
 * four letters or more, no numbers, no stoplist word, possessive dropped.
 */
export function headlineWords(title) {
  const words = new Set()
  for (const raw of String(title ?? '').toLowerCase().split(/[^\p{L}\p{N}']+/u)) {
    const word = raw.replace(/'s$/, '').replace(/'/g, '')
    if (word.length < MIN_LABEL_LENGTH) continue
    if (/\p{N}/u.test(word)) continue
    if (HEADLINE_STOPLIST.has(word)) continue
    words.add(word)
  }
  return words
}

// A sentence under this is usually a caption or a stray fragment. Over it, the
// splitter has run two sentences together and the "quote" stops being readable.
export const MIN_CLAIM_WORDS = 8
export const MAX_CLAIM_WORDS = 60

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const wordCount = (value) => String(value ?? '').trim().split(/\s+/).filter(Boolean).length

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `2026-09-11` becomes `11 September 2026`. No locale, no surprises. */
export function longDate(value) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!parts) return ''
  const month = MONTHS[Number(parts[2]) - 1]
  if (!month) return ''
  return `${Number(parts[3])} ${month} ${parts[1]}`
}

/** The labels of one catalog entity that are safe to match on. */
export function usableLabels(entity) {
  const labels = []
  const seen = new Set()
  for (const label of [entity?.name, ...(entity?.altNames ?? [])]) {
    const text = String(label ?? '').trim()
    if (text.length < MIN_LABEL_LENGTH) continue
    if (LABEL_STOPLIST.has(text.toLowerCase())) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(text)
  }
  return labels
}

// Whole word, case insensitive, punctuation and accents respected. Built once
// per catalog rather than once per article, because a run reads every saved
// article against every entry.
const patternCache = new WeakMap()

function patternsFor(catalog) {
  const cached = patternCache.get(catalog)
  if (cached) return cached
  const rows = []
  for (const entity of Array.isArray(catalog) ? catalog : []) {
    if (!entity?.slug || !entity?.name) continue
    const labels = usableLabels(entity)
    if (!labels.length) continue
    const body = labels.map(escapeRegex).join('|')
    rows.push({
      entity,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'iu'),
    })
  }
  patternCache.set(catalog, rows)
  return rows
}

// A saved article is the whole page, so the first sentence of the body often
// has the page furniture glued to the front of it: a photo credit, or the
// breadcrumb trail above the headline. None of that is part of the sentence,
// and a reader seeing "Image: Rockstar Games We've seen glimpses..." on an
// entry page is looking at a bug. Only a known, leading run is removed, and
// what is left is still a run of characters from the article, so the verbatim
// check in checks.mjs still passes.
// A photo credit is a run of proper nouns, so it cannot be told from the start
// of a sentence by capital letters alone. These are the capitalised words that
// begin a sentence rather than name a company, and the credit stops at the
// first one of them. Without this, "Image: Rockstar Games We've seen..." loses
// the "We've" along with the credit.
const SENTENCE_STARTERS = new Set([
  'A', 'After', 'All', 'An', 'And', 'As', 'At', 'Before', 'But', 'During',
  'For', 'He', 'Her', 'His', 'How', 'I', 'If', 'In', 'It', 'Its', 'More',
  'No', 'Not', 'On', 'One', 'Or', 'Our', 'She', 'So', 'That', 'The', 'Their',
  'Then', 'There', 'These', 'They', 'This', 'Those', 'To', 'Two', 'We', 'What',
  'When', 'While', 'Who', 'Why', 'With', 'You', 'Your',
])

const CREDIT_LABEL = /^(?:Image|Photo|Picture|Credit|Screenshot)s?\s*:\s*/
// the breadcrumb strip above a headline, e.g. "Home News Grand Theft Auto VI"
const BREADCRUMB = /^Home\s+(?:News|Features|Reviews|Guides)\s+(?:Grand Theft Auto (?:VI|6)\s+)?/

/**
 * The sentence with any leading page furniture taken off the front.
 * Only a leading run is removed, so what is left is still a run of characters
 * from the article and the verbatim check in checks.mjs still passes.
 */
export function stripPageChrome(sentence) {
  let text = String(sentence ?? '').trim()

  const afterCrumb = text.replace(BREADCRUMB, '')
  if (afterCrumb.trim()) text = afterCrumb.trim()

  if (CREDIT_LABEL.test(text)) {
    const rest = text.replace(CREDIT_LABEL, '')
    const words = rest.split(/\s+/)
    let cut = 0
    // At most four words of credit, and it ends at the first word that is not
    // a plain proper noun or that reads as the start of a sentence.
    while (cut < words.length && cut < 4) {
      const word = words[cut]
      if (!/^[A-Z][\p{L}]*$/u.test(word)) break
      if (SENTENCE_STARTERS.has(word)) break
      cut += 1
    }
    const kept = words.slice(cut).join(' ').trim()
    // A correct cut leaves a sentence, and a sentence begins with a capital.
    // A lowercase first letter means the cut landed inside the sentence, so
    // the guess is thrown away and the caller rejects the sentence instead of
    // publishing a fragment.
    if (cut > 0 && /^[\p{Lu}(]/u.test(kept)) text = kept
  }

  return text.trim()
}

// Sentences that are on the page but are not reporting. A question is asking
// the reader something, not telling them anything, and an outlet pointing at
// its own other pages is selling, not reporting. Neither belongs on an entry
// page as a recorded fact.
const NOT_REPORTING = [
  /\bour full\b/i,
  /\b(?:read|see|check out) (?:more|our|the full)\b/i,
  /\b(?:sign up|subscribe|newsletter)\b/i,
  /\bfollow us\b/i,
]

/** True when a sentence is quotable as it stands. */
export function quotableSentence(sentence) {
  const text = String(sentence ?? '')
  const words = wordCount(text)
  if (words < MIN_CLAIM_WORDS || words > MAX_CLAIM_WORDS) return false
  if (hasEmDash(text)) return false
  // U+FFFD means the text was decoded with the wrong character set somewhere
  // upstream. The words may be right but the characters are damaged, and
  // damaged characters must never reach a published page.
  if (text.includes('\uFFFD')) return false
  // stripPageChrome was given the first go. Furniture still on the front here
  // means it could not tell where the credit ended, so the sentence is left
  // out rather than published with the furniture attached.
  if (CREDIT_LABEL.test(text) || BREADCRUMB.test(text)) return false
  // A question asks; it does not report.
  if (text.trim().endsWith('?')) return false
  return !NOT_REPORTING.some((pattern) => pattern.test(text))
}

/**
 * Read one saved article with no model. Every claim is a whole sentence of the
 * article, used as both the written fact and the quote, so the verbatim check
 * in extract.mjs passes by construction rather than by trust.
 *
 * Only entries that are already in the catalog can come out of here. Logic
 * never proposes a new entry: deciding that a name is a thing worth a page is
 * a judgement, and this file does not make judgements.
 */
export function logicClaims(record, catalog) {
  const title = String(record?.title ?? '')
  const summary = String(record?.summary ?? '')
  const text = String(record?.text ?? '')
  const aboutGta6 = MATCH.test(`${title} ${text}`)
  // The headline and the outlet's own summary say what an article is about.
  // A name that only turns up in the body is background: most GTA 6 articles
  // mention the two leads and Vice City in passing, and treating every such
  // mention as the subject glued unrelated stories into one page.
  const lead = `${title} ${summary}`
  if (!aboutGta6) return { aboutGta6: false, entities: [] }

  const sentences = sentencesIn(text).map(stripPageChrome).filter(quotableSentence)
  const entities = []

  for (const { entity, pattern } of patternsFor(catalog)) {
    const claims = []
    const seen = new Set()
    for (const sentence of sentences) {
      if (!pattern.test(sentence)) continue
      const key = normalise(sentence)
      if (!key || seen.has(key)) continue
      seen.add(key)
      claims.push({ fact: sentence, quote: sentence })
    }
    if (!claims.length) continue
    entities.push({
      entityType: entity.entityType,
      name: entity.name,
      altNames: Array.isArray(entity.altNames) ? [...entity.altNames] : [],
      slug: entity.slug,
      viaLogic: true,
      salient: pattern.test(lead),
      claims,
    })
  }

  return { aboutGta6, entities }
}

// --- the quote digest ---------------------------------------------------------

export function joinWords(list) {
  const parts = list.filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

const byPublishedThenOutlet = (a, b) =>
  String(a.published ?? '').localeCompare(String(b.published ?? '')) ||
  String(a.outlet ?? '').localeCompare(String(b.outlet ?? ''))

/**
 * The headlines the digest may carry, best first: the official report, then
 * the rest by date. A headline is never rewritten, so when the first one is
 * too long for the title bars the next outlet's own words are used instead.
 */
export function digestTitles(items) {
  const official = [...items].filter((item) => item.tier === 'TIER_1_OFFICIAL').sort(byPublishedThenOutlet)
  const rest = [...items].filter((item) => item.tier !== 'TIER_1_OFFICIAL').sort(byPublishedThenOutlet)
  return [...new Set([...official, ...rest].map((item) => String(item.title ?? '').trim()).filter(Boolean))]
}

/** The headline the digest carries: the official report, else the earliest. */
export const digestTitle = (items) => digestTitles(items)[0] ?? ''

export const titleFits = (title) => title.length >= 20 && title.length <= 90 && !hasEmDash(title)

/**
 * A template sentence holding outlet names, entity names and a date, all of
 * them copied out of the data. Names come off the end until it fits, then the
 * date phrase goes, because a description that does not fit is a refusal.
 */
export function digestDescription(outlets, names, date, headline = '') {
  const day = longDate(date)
  const who = `What ${joinWords(outlets)} reported`
  const tails = [
    ', quoted in their own words with a link to each report.',
    ', in their own words.',
  ]
  const build = (list, withDate, tail) =>
    `${who} about ${joinWords(list)}${withDate && day ? ` on ${day}` : ''}${tail}`

  const tries = []
  for (const withDate of [true, false]) {
    for (let count = names.length; count >= 1; count -= 1) {
      tries.push(build(names.slice(0, count), withDate, tails[0]))
    }
  }
  // A story with no catalog entry in it, an actor or a court case, still has
  // its headline. The headline is the outlet's own words, so it is data.
  if (headline) {
    for (const withDate of [true, false]) {
      for (const tail of tails) {
        tries.push(`${who}${withDate && day ? ` on ${day}` : ''}: "${headline}"${tail}`)
      }
    }
    tries.push(`${who}: "${headline}".`)
  }
  return tries.find((text) => text.length >= 70 && text.length <= 160) ?? null
}

const linkText = (value) => String(value ?? '').replace(/\[/g, '(').replace(/\]/g, ')')

function digestSection(item, quotes) {
  const lines = [`## ${item.outlet}, ${longDate(item.published) || 'date unknown'}`, '']
  lines.push(`[${linkText(item.title)}](${item.url})`, '')
  const summary = String(item.summary ?? '').trim()
  if (summary && !hasEmDash(summary)) {
    lines.push("The outlet's own summary:", '', `> ${summary}`, '')
  }
  for (const quote of quotes) lines.push(`> ${quote}`, '')
  return lines
}

const OPENING = (names) =>
  `This page collects what named outlets published about ${names}, in their own words. ` +
  'This site wrote none of the sentences in quotation marks below. ' +
  'Each one links to the report it was taken from.'

const CLOSING =
  "Every report above is on the site's fixed source list. A report is not a " +
  'confirmation: the mark on each linked entry says who said it.'

/**
 * Build a whole news page from the data alone. Every fact on it sits inside a
 * blockquote that lane 2 already proved is a real run of characters from the
 * saved article the section links to. The rest is template.
 *
 * Returns `{ held }` when the data cannot fill the template, so the caller can
 * leave the story alone and try again when another outlet joins it.
 */
export function logicDraft(story, claims, items = story, { catalog = null } = {}) {
  const ordered = [...items].sort(byPublishedThenOutlet)
  const candidates = digestTitles(ordered)
  const title = candidates.find(titleFits)
  if (!title) {
    const first = candidates[0] ?? ''
    if (hasEmDash(first)) return { held: 'the outlet headline holds an em dash' }
    return { held: `the outlet headline is ${first.length} characters` }
  }

  const outlets = [...new Set(ordered.map((item) => item.outlet).filter(Boolean))]
  const names = [...new Set(ordered.flatMap((item) => item.displayNames ?? []).filter(Boolean))]
  const date = ordered.map((item) => item.published).filter(Boolean).sort()[0] ?? null
  const description = digestDescription(outlets, names, date, title)
  if (!description) return { held: 'no description built from the data fits 70 to 160 characters' }

  const byUrl = new Map()
  for (const claim of claims) {
    if (!byUrl.has(claim.url)) byUrl.set(claim.url, [])
    byUrl.get(claim.url).push(claim.quote)
  }

  const lines = [OPENING(joinWords(names) || 'Grand Theft Auto VI'), '']
  for (const item of ordered) lines.push(...digestSection(item, byUrl.get(item.url) ?? []))
  lines.push(CLOSING)

  const relatedNames = [...names, ...new Set(ordered.flatMap((item) => [...(item.mentions ?? item.names ?? [])]))]
  const related = catalog
    ? [...new Set(relatedNames.map((value) => catalog.get(normalise(value))).filter(Boolean))].sort()
    : []

  return {
    title,
    description,
    body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    related,
    relatedNames,
    held: null,
  }
}

/**
 * Everything a digest is allowed to hold a number from: the quotes, and the
 * outlet's own headline, summary and published date. All of it is data.
 */
export function digestNumberSource(items, quotes) {
  return [
    ...quotes,
    ...items.flatMap((item) => [
      item.title,
      item.summary ?? '',
      item.published ?? '',
      longDate(item.published),
    ]),
  ].join('\n')
}
