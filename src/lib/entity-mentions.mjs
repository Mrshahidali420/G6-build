// "Mentioned in": the news posts, Rockstar Newswire posts and tracker claims
// that name an entity, for the block at the foot of its page.
//
// A row counts when it links the entity by slug (its own `related` list) or
// when its title or description names the entity outright: a whole word, case
// insensitive, using the same label rules the robot uses (scripts/robot/
// logic.mjs), plus a short list of names that are ordinary English before they
// are anything in the game. Nothing is matched on the long machine summaries.
//
// The index is built once per build and shared by every entity page.

import { getCollection } from 'astro:content'
import { usableLabels } from '../../scripts/robot/logic.mjs'
import newswire from '../data/newswire.json'
import { pageEntities, bySlug } from './entities.mjs'
import { cleanNote } from './shots.mjs'

// Published copy carries no long dashes and no emoji (DESIGN.md), and some
// Reddit titles in the tracker have both.
const tidy = (text) =>
  cleanNote(String(text ?? '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ''))

export const MENTION_LIMIT = 6

// Names that would claim a headline which never meant the entry. "Cats" in a
// Reddit title is about cats; "Phantom" is usually not the truck.
const GENERIC_NAMES = new Set([
  'cats', 'dogs', 'ducks', 'fish', 'eels', 'foxes', 'sharks', 'snakes', 'dolphins',
  'seagulls', 'raccoons', 'cougars', 'iguanas', 'swimming', 'diving', 'fruit',
  'want', 'limit', 'halt', 'beast', 'atomic', 'patriot', 'dignity', 'impure',
  'obey', 'shark', 'crest', 'prairie', 'sentinel', 'alpha', 'swift', 'rebel',
  'outlaw', 'phantom', 'phoenix', 'zombie', 'hammer', 'knife', 'pistol',
  'grenade', 'crowbar', 'kayak', 'minivan', 'emperor', 'mule', 'hamlet',
  'crescent', 'sundown', 'buffalo', 'blazer', 'locust', 'rubble', 'duster',
  'packer', 'jubilee', 'marquis', 'intruder', 'scorcher', 'ingot', 'nimbus',
  'growler', 'hellion', 'mesa', 'rancher', 'regina', 'speedo', 'capo', 'sumo',
  'logger', 'thaw', 'boxville', 'dinghy', 'airboat', 'fanboat', 'phil', 'brian',
])

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function buildPatterns() {
  const rows = []
  for (const entity of pageEntities) {
    const labels = usableLabels(entity).filter((label) => !GENERIC_NAMES.has(label.toLowerCase()))
    if (!labels.length) continue
    rows.push({
      slug: entity.slug,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])(?:${labels.map(escapeRegex).join('|')})(?![\\p{L}\\p{N}])`, 'iu'),
    })
  }
  return rows
}

const KIND_LABEL = { news: 'News', newswire: 'Rockstar Newswire', tracker: 'Claim tracker' }

async function buildIndex() {
  const [news, tracker] = await Promise.all([getCollection('news'), getCollection('tracker')])

  const items = [
    ...news.map((post) => ({
      kind: 'news',
      title: post.data.title,
      text: `${post.data.title} ${post.data.description}`,
      href: `/news/${post.id}`,
      external: false,
      date: post.data.date,
      related: post.data.related,
    })),
    ...(newswire.posts ?? []).map((post) => ({
      kind: 'newswire',
      title: post.title,
      text: `${post.title} ${post.subtitle ?? ''}`,
      href: post.url,
      external: true,
      date: post.date,
      related: [],
    })),
    ...tracker.map((claim) => ({
      kind: 'tracker',
      title: claim.data.title,
      text: `${claim.data.title} ${claim.data.description}`,
      href: `/tracker/${claim.id}`,
      external: false,
      date: claim.data.date,
      related: claim.data.related,
    })),
  ]

  const patterns = buildPatterns()
  const index = new Map()
  for (const item of items) {
    const slugs = new Set(item.related.filter((slug) => bySlug.has(slug)))
    for (const row of patterns) if (row.pattern.test(item.text)) slugs.add(row.slug)
    const entry = Object.freeze({
      kind: item.kind,
      kindLabel: KIND_LABEL[item.kind],
      title: tidy(item.title),
      href: item.href,
      external: item.external,
      date: item.date,
    })
    for (const slug of slugs) {
      const list = index.get(slug) ?? []
      list.push(entry)
      index.set(slug, list)
    }
  }

  for (const list of index.values()) {
    list.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title))
  }
  return index
}

let cached = null

/** Up to MENTION_LIMIT posts and claims naming this entity, newest first. */
export async function mentionsFor(slug, limit = MENTION_LIMIT) {
  cached ??= buildIndex()
  const index = await cached
  return (index.get(slug) ?? []).slice(0, limit)
}
