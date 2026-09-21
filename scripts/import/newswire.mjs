/**
 * Records every Rockstar Newswire post tagged Grand Theft Auto VI.
 *
 * The Newswire is the only place Rockstar announces anything itself, so this
 * list is the tier 1 record the rest of the site is measured against. If a
 * claim is not in here, it did not come from Rockstar.
 *
 * How it reads the list: rockstargames.com is a JavaScript shell, but the
 * GraphQL endpoint behind it answers a plain query with no key and no browser.
 * The YouMarakshy/rockstar-newswire project found the endpoint and the
 * Grand Theft Auto VI tag id (666) by watching the site's own requests. It
 * drove a headless browser to lift a persisted-query hash; that turned out to
 * be unnecessary, because the endpoint accepts a written-out query.
 *
 * This stores the title, subtitle, date and link. It does not store the body
 * of any article. Rockstar wrote those and they stay on rockstargames.com.
 *
 * Nothing is ever deleted. A post that drops off the feed keeps its row, with
 * the date it was last seen, because the record is the point.
 *
 *   node scripts/import/newswire.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'src', 'data', 'newswire.json')

const ENDPOINT = 'https://graph.rockstargames.com'
const SITE = 'https://www.rockstargames.com'
const TAG_GTA6 = 666
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const QUERY = `query NewswireList($page: Int, $tagId: Int, $locale: String!) {
  posts(page: $page, tagId: $tagId, locale: $locale) {
    results { id title url created subtitle primary_tags { name id } secondary_tags { name } }
  }
}`

/**
 * Rockstar sends "9/17/26, 8:00 AM" with no timezone. Month and day first,
 * two digit year. Turned into a plain ISO date so the site can sort it.
 */
function isoDate(created) {
  const match = String(created || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})/)
  if (!match) return null
  const [, month, day, year] = match
  return `20${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The last path segment of the article URL, which reads as a title. */
const slugOf = (url) => String(url || '').split('/').filter(Boolean).pop() || ''

async function fetchPosts(page) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'user-agent': UA, 'content-type': 'application/json' },
    body: JSON.stringify({
      operationName: 'NewswireList',
      variables: { page, tagId: TAG_GTA6, locale: 'en_us' },
      query: QUERY,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((error) => error.message).join('; '))
  return json.data?.posts?.results || []
}

const today = new Date().toISOString().slice(0, 10)

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { posts: [] }
const byId = new Map(previous.posts.map((post) => [String(post.id), post]))
const wasKnown = new Set(byId.keys())

let live = []
try {
  live = await fetchPosts(1)
} catch (error) {
  console.error(`[newswire] fetch failed: ${error.message}`)
  if (!wasKnown.size) process.exit(1)
  console.error(`[newswire] keeping the ${wasKnown.size} posts already on file`)
}

let added = 0
let changed = 0
const newPosts = []

for (const post of live) {
  const id = String(post.id)
  const built = {
    id,
    title: String(post.title || '').trim(),
    subtitle: String(post.subtitle || '').trim() || null,
    slug: slugOf(post.url),
    url: SITE + post.url,
    date: isoDate(post.created),
    displayDate: String(post.created || ''),
    tags: [
      ...(post.primary_tags || []).map((tag) => tag.name),
      ...(post.secondary_tags || []).map((tag) => tag.name),
    ].filter(Boolean),
    firstSeen: byId.get(id)?.firstSeen || today,
    lastSeen: today,
  }
  const before = byId.get(id)
  if (!before) {
    added += 1
    newPosts.push(built)
  } else if (before.title !== built.title || before.subtitle !== built.subtitle) {
    changed += 1
  }
  byId.set(id, built)
}

const posts = [...byId.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)))
const gone = posts.filter((post) => post.lastSeen !== today && wasKnown.has(post.id)).length

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'Rockstar Games Newswire, tag "Grand Theft Auto VI"',
      sourceUrl: `${SITE}/newswire/tags/${TAG_GTA6}`,
      method:
        'Read from the GraphQL endpoint that rockstargames.com uses for its own Newswire list. Titles, subtitles, dates and links only. No article text is copied.',
      checked: today,
      // Only the state of the record is stored. How many posts a single run
      // happened to add is run noise, and putting it in the file made every
      // run look like a change to the scheduled job.
      counts: { total: posts.length, missingFromFeed: gone },
      posts,
    },
    null,
    2,
  ) + '\n',
)

console.log(`[newswire] feed returned ${live.length} posts`)
console.log(`[newswire] ${added} new, ${changed} changed, ${gone} on file but no longer in the feed`)
console.log(`[newswire] ${posts.length} posts on record, ${posts[posts.length - 1]?.date} to ${posts[0]?.date}`)
/**
 * The scheduled job needs to know which posts are new so it can open an issue
 * for each one. It passes a path in NEWSWIRE_NEW_OUT and reads the file after.
 */
if (process.env.NEWSWIRE_NEW_OUT) {
  writeFileSync(process.env.NEWSWIRE_NEW_OUT, `${JSON.stringify(newPosts, null, 2)}\n`)
  console.log(`[newswire] wrote ${newPosts.length} new posts to ${process.env.NEWSWIRE_NEW_OUT}`)
}

console.log('[newswire] wrote src/data/newswire.json')
