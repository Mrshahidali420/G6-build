// Watches the Rockstar Newswire for new GTA 6 posts.
//
// This is a watcher, not a scraper. It stores nothing but a link and a title,
// and it publishes nothing. When it sees a post it has not seen before it opens
// a GitHub issue so a human can read the source and write the page. Rockstar's
// words never get copied onto this site, which keeps the news section honest
// and keeps us clear of reposting someone else's article.
//
// Run: node scripts/watch-newswire.mjs
// Writes: data/newswire-seen.json  (the memory)
// Prints: a JSON array of new items on stdout, [] when nothing is new.

import fs from 'node:fs/promises'

const SEEN_FILE = 'data/newswire-seen.json'
const FEEDS = [
  'https://www.rockstargames.com/newswire.rss',
  'https://www.rockstargames.com/newswire/rss',
]
const PAGE = 'https://www.rockstargames.com/newswire'

// Only care about posts that look like they are about this game.
const KEYWORDS = /grand theft auto vi|gta ?6|gta ?vi|vice city|leonida/i

const UA = 'gta6record-newswire-watcher (+https://gta6record.com)'

async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': UA } })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.text()
}

function fromRss(xml) {
  const items = []
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const link = block.match(/<link>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/link>/i)?.[1]
    const title = block.match(/<title>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/title>/is)?.[1]
    const date = block.match(/<pubDate>\s*(.*?)\s*<\/pubDate>/i)?.[1]
    if (link && title) items.push({ url: link.trim(), title: title.trim(), date: date?.trim() ?? null })
  }
  return items
}

function fromHtml(html) {
  const seen = new Set()
  const items = []
  const pattern = /href="(\/newswire\/article\/[^"]+)"[^>]*>([^<]{6,160})</g
  let match
  while ((match = pattern.exec(html)) !== null) {
    const url = `https://www.rockstargames.com${match[1]}`
    if (seen.has(url)) continue
    seen.add(url)
    items.push({ url, title: match[2].trim(), date: null })
  }
  return items
}

async function collect() {
  for (const feed of FEEDS) {
    try {
      const items = fromRss(await get(feed))
      if (items.length) return items
    } catch {
      // Try the next feed, then the page. A dead feed is not a failure.
    }
  }
  return fromHtml(await get(PAGE))
}

async function loadSeen() {
  try {
    return new Set(JSON.parse(await fs.readFile(SEEN_FILE, 'utf8')))
  } catch {
    return new Set()
  }
}

const items = (await collect()).filter((item) => KEYWORDS.test(item.title))
const seen = await loadSeen()
const fresh = items.filter((item) => !seen.has(item.url))

for (const item of items) seen.add(item.url)
await fs.writeFile(SEEN_FILE, `${JSON.stringify([...seen].sort(), null, 2)}\n`)

console.log(JSON.stringify(fresh, null, 2))
