/**
 * Keeps the claim record going.
 *
 * The record was started from the AaronShenny/gta6-news archive, which watched
 * four feeds for two years and logged every GTA 6 item that crossed them with
 * the status it carried that day. That archive stops. This script is the same
 * job, running here, so the record does not stop with it.
 *
 * It reads the same four feeds, drops anything already logged, and asks a
 * model to do one narrow piece of work per item: read the item, pull out the
 * claim, and say which of four statuses it carried. CONFIRMED, RUMOR, LEAK or
 * UNKNOWN. The model does not write the page. The page is built by
 * src/pages/tracker/[slug].astro out of typed frontmatter, exactly as the
 * imported claims are.
 *
 * The model is GitHub Models on the Action's own GITHUB_TOKEN, which is free
 * inside a workflow. Gemini's free tier is twenty calls a day and would run
 * out on the first busy morning.
 *
 * Nothing is fetched from inside a leak. The record says a leak was reported
 * and links to the place that reported it. It never stores, mirrors or
 * describes leaked material.
 *
 *   node scripts/fetch-claims.mjs           write new claims
 *   node scripts/fetch-claims.mjs --dry-run read the feeds, write nothing
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildEntityIndex, entitiesIn, sourceOf, topicsOf, describe, claimFile, slugify,
} from './lib/claim-entities.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'content', 'tracker')
const DRY = process.argv.includes('--dry-run')

/**
 * The feeds the record watches.
 *
 * The archive also watched https://www.rockstargames.com/newswire/rss. That
 * address now answers 404, and Rockstar's own posts are already pulled by
 * scripts/import/newswire.mjs straight from their GraphQL endpoint and listed
 * at /newswire, so nothing is lost by leaving it out.
 */
const FEEDS = [
  { url: 'https://www.ign.com/rss/articles/feed?tags=grand-theft-auto-vi', name: 'IGN' },
  { url: 'https://www.gamespot.com/feeds/game-news', name: 'GameSpot' },
  { url: 'https://www.reddit.com/r/GTA6/top/.rss?t=day', name: 'r/GTA6' },
]

/** An item has to say one of these to be about this game at all. */
const KEYWORDS = ['gta 6', 'gta vi', 'grand theft auto vi', 'grand theft auto 6', 'vice city', 'leonida']

/** How many new claims one run may write. A busy day should not cost a hundred model calls. */
const MAX_PER_RUN = 12

const MODEL = process.env.CLAIMS_MODEL || 'openai/gpt-4o-mini'
const ENDPOINT = 'https://models.github.ai/inference/chat/completions'

/* --------------------------------------------------------------------- feed */

const strip = (value) =>
  String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const tagOf = (block, tag) => {
  const hit = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return hit ? strip(hit[1]) : ''
}

/** RSS <item> and Atom <entry> both, because these four feeds use both. */
function parseFeed(xml) {
  const out = []
  for (const block of xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || []) {
    const title = tagOf(block, 'title')
    let link = tagOf(block, 'link')
    if (!link) {
      const href = block.match(/<link[^>]*href=["']([^"']+)["']/i)
      link = href ? href[1] : ''
    }
    const body = tagOf(block, 'content:encoded') || tagOf(block, 'description') || tagOf(block, 'content') || tagOf(block, 'summary')
    const when = tagOf(block, 'pubDate') || tagOf(block, 'updated') || tagOf(block, 'published')
    if (title && link) out.push({ title, link, body, when })
  }
  return out
}

async function readFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: { 'user-agent': 'gta6record-claim-fetcher/1.0 (+https://gta6record.com)' },
    })
    if (!response.ok) {
      console.log(`[claims] ${feed.name}: HTTP ${response.status}, skipped`)
      return []
    }
    const items = parseFeed(await response.text())
    console.log(`[claims] ${feed.name}: ${items.length} items`)
    return items
  } catch (error) {
    console.log(`[claims] ${feed.name}: ${error.message}, skipped`)
    return []
  }
}

const isRelevant = (item) => {
  const text = `${item.title} ${item.body}`.toLowerCase()
  return KEYWORDS.some((word) => text.includes(word))
}

/* -------------------------------------------------------------------- model */

const PROMPT = `You log claims about the video game Grand Theft Auto VI for a public record.

You are given one item from a news feed or a forum. Return JSON only, with these keys:

  title            A plain factual headline for the claim. No hype, no clickbait, no exclamation marks. Under 90 characters.
  description      One sentence for a search result. Between 70 and 160 characters.
  summary          One paragraph, 40 to 90 words, saying what the item claims. Report it. Never assert it as fact yourself. Write "the post says", "the report says".
  points           3 to 6 short factual takeaways, one sentence each.
  faq              0 to 4 objects with keys q and a. Real questions a reader would ask about this claim, answered in one or two sentences. Empty list if the item does not support any.
  topics           2 to 6 short subject tags. No generic ones like "gaming" or "news".
  classification   Exactly one of CONFIRMED, RUMOR, LEAK, UNKNOWN.

How to classify:
  CONFIRMED  Rockstar Games said it itself, or it is a fact anybody can check right now.
  RUMOR      Somebody claimed it and nobody has backed it up.
  LEAK       The claim rests on material Rockstar has not published.
  UNKNOWN    Community talk, a question, a countdown, or anything that fits none of the above.

Never invent a detail that is not in the item. If the item is thin, return fewer points rather than making some up. Never describe the contents of leaked material; say only that a leak was reported.`

async function classify(item, token) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: `Source: ${item.link}\nHeadline: ${item.title}\n\n${item.body.slice(0, 4000)}`,
        },
      ],
    }),
  })
  if (!response.ok) {
    throw new Error(`model HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  const payload = await response.json()
  const text = payload.choices?.[0]?.message?.content
  if (!text) throw new Error('model returned no content')
  return JSON.parse(text)
}

/* ---------------------------------------------------------------------- run */

const STATUS = new Set(['CONFIRMED', 'RUMOR', 'LEAK', 'UNKNOWN'])

/** Every source URL and slug already in the record, so nothing is logged twice. */
function alreadyLogged() {
  const urls = new Set()
  const slugs = new Set()
  if (!existsSync(OUT)) return { urls, slugs }
  for (const name of readdirSync(OUT)) {
    if (!name.endsWith('.md')) continue
    slugs.add(name.replace(/\.md$/, ''))
    const hit = readFileSync(join(OUT, name), 'utf8').match(/^\s+url:\s*"([^"]+)"/m)
    if (hit) urls.add(hit[1])
  }
  return { urls, slugs }
}

const token = process.env.GITHUB_TOKEN || process.env.MODELS_TOKEN
if (!token && !DRY) {
  console.error('[claims] no GITHUB_TOKEN. This script is meant to run inside a GitHub Action.')
  process.exit(1)
}

const { urls, slugs } = alreadyLogged()
console.log(`[claims] ${urls.size} claims already in the record`)

const feeds = await Promise.all(FEEDS.map(readFeed))
const candidates = []
for (const items of feeds) {
  for (const item of items) {
    if (!isRelevant(item)) continue
    if (urls.has(item.link)) continue
    if (candidates.some((other) => other.link === item.link)) continue
    candidates.push(item)
  }
}

console.log(`[claims] ${candidates.length} new items about this game`)

if (DRY) {
  for (const item of candidates.slice(0, 20)) console.log(`[claims]   ${item.title}`)
  console.log('[claims] dry run, nothing written')
  process.exit(0)
}

const index = buildEntityIndex(join(ROOT, 'src', 'data', 'entities.json'))
mkdirSync(OUT, { recursive: true })

const today = new Date().toISOString().slice(0, 10)
let written = 0
let failed = 0

for (const item of candidates.slice(0, MAX_PER_RUN)) {
  let result
  try {
    result = await classify(item, token)
  } catch (error) {
    console.log(`[claims] skipped "${item.title.slice(0, 60)}": ${error.message}`)
    failed += 1
    continue
  }

  const status = String(result.classification || '').toUpperCase()
  const points = (result.points || []).map((point) => String(point).trim()).filter((point) => point.length > 10)
  const summary = String(result.summary || '').replace(/\s+/g, ' ').trim()

  // The same quality gate the import used. A claim needs a real paragraph and
  // three takeaways, or the page says nothing the headline did not.
  if (!STATUS.has(status) || summary.split(/\s+/).length < 30 || points.length < 3) {
    console.log(`[claims] dropped "${item.title.slice(0, 60)}": too thin or no status`)
    failed += 1
    continue
  }

  const title = String(result.title || item.title).trim()
  let slug = slugify(title)
  if (!slug) slug = slugify(item.title)
  if (slugs.has(slug)) slug = `${slug}-${today}`
  if (slugs.has(slug)) {
    console.log(`[claims] dropped "${title.slice(0, 60)}": slug already used`)
    failed += 1
    continue
  }

  const faq = (result.faq || [])
    .map((entry) => ({ q: String(entry.q || '').trim(), a: String(entry.a || '').replace(/\s+/g, ' ').trim() }))
    .filter((entry) => entry.q.length > 8 && entry.a.length > 15)
    .slice(0, 6)
  const topics = topicsOf(result.topics || [])

  const when = item.when ? new Date(item.when) : null
  const date = when && !Number.isNaN(when.valueOf()) ? when.toISOString().slice(0, 10) : today

  const claim = {
    title,
    description: describe(result.description, title, summary),
    date,
    status,
    source: { ...sourceOf(item.link), url: item.link },
    summary,
    points: points.slice(0, 8),
    faq,
    topics,
    related: entitiesIn(index, [title, summary, ...points, ...faq.map((e) => `${e.q} ${e.a}`), ...topics].join(' ')),
  }

  writeFileSync(join(OUT, `${slug}.md`), claimFile(claim))
  slugs.add(slug)
  urls.add(item.link)
  written += 1
  console.log(`[claims] + ${status.padEnd(9)} ${slug}`)
}

console.log(`[claims] wrote ${written} new claims, ${failed} skipped`)
if (candidates.length > MAX_PER_RUN) {
  console.log(`[claims] ${candidates.length - MAX_PER_RUN} left for the next run`)
}
