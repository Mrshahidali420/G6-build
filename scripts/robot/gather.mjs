// Lane one: the five RSS feeds.
//
// The robot reads a feed, keeps only items whose own title or summary mentions
// this game, and saves what the outlet itself published. It writes no prose and
// makes no judgement about whether any of it is true. A dead feed is logged and
// skipped, never a failure: one outlet being down is not a reason to lose a run.
//
// Run: node scripts/robot/gather.mjs
// Writes: data/robot/raw/<id>.json, data/robot/seen.json

import { FEED_SOURCES, MATCH } from './sources.mjs'
import { MAX_NEW_PER_RUN, clean, getText, loadSeen, saveRaw, saveSeen } from './lib.mjs'

function parseFeed(xml) {
  const items = []
  for (const block of xml.split(/<item[\s>]/i).slice(1)) {
    const body = block.split(/<\/item>/i)[0]
    const rawLink =
      body.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ??
      body.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ??
      ''
    const link = clean(rawLink)
    const title = clean(body.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    const date = clean(body.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '')
    const description = clean(
      body.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ??
        body.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
        '',
    )
    if (!link || !title) continue
    if (!/^https?:\/\//i.test(link)) continue
    items.push({ url: link, title, date: date || null, description })
  }
  return items
}

async function readFeed(source) {
  try {
    const items = parseFeed(await getText(source.feed))
    console.log(`${source.outlet}: ${items.length} items in the feed`)
    return items
  } catch (error) {
    console.log(`${source.outlet}: feed did not load, skipping (${error.message})`)
    return []
  }
}

const seen = await loadSeen()
let saved = 0
let matched = 0
let already = 0

for (const source of FEED_SOURCES) {
  const items = await readFeed(source)
  const hits = items.filter((item) => MATCH.test(item.title) || MATCH.test(item.description))
  matched += hits.length
  if (hits.length) console.log(`${source.outlet}: ${hits.length} mention this game`)

  for (const item of hits) {
    if (seen.has(item.url)) {
      already += 1
      seen.add(item.url)
      continue
    }
    seen.add(item.url)
    if (saved >= MAX_NEW_PER_RUN) {
      console.log(`  cap reached, ${MAX_NEW_PER_RUN} new items this run`)
      break
    }
    const record = await saveRaw({
      source,
      url: item.url,
      title: item.title,
      summary: item.description,
      published: item.date,
    })
    if (record) {
      saved += 1
      console.log(`  saved ${record.id} (${record.outlet}, published ${record.published ?? 'date unknown'})`)
    }
  }

  // Every link the run looked at goes into the memory, kept or not, so a feed
  // that repeats the same item every hour is only ever fetched once.
  for (const item of items) seen.add(item.url)
}

await saveSeen(seen)

console.log('')
console.log(`gather: ${matched} matching items, ${already} seen before, ${saved} new raw files written`)
console.log(`gather: memory now holds ${seen.size} links`)
