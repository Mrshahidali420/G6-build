// Lane one: the RSS and Atom feeds.
//
// The robot reads a feed, keeps only items whose own title or summary mentions
// this game, and saves what the outlet itself published. It writes no prose and
// makes no judgement about whether any of it is true. A dead feed is logged and
// skipped, never a failure: one outlet being down is not a reason to lose a run.
//
// Run: node scripts/robot/gather.mjs
// Writes: data/robot/raw/<id>.json, data/robot/seen.json

import { FEED_SOURCES, MATCH } from './sources.mjs'
import { MAX_NEW_PER_RUN, getText, isoDay, loadSeen, parseFeed, saveRaw, saveSeen } from './lib.mjs'

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

// A manual run may pass ROBOT_SINCE=YYYY-MM-DD to re-read the feeds as if the
// memory were empty for anything published on or after that day. It is how a
// missed day is recovered by hand without clearing seen.json and refetching
// the whole back catalogue.
const SINCE = (process.env.ROBOT_SINCE ?? '').trim()
const sinceDay = /^\d{4}-\d{2}-\d{2}$/.test(SINCE) ? SINCE : null
if (SINCE && !sinceDay) console.log(`gather: ignoring ROBOT_SINCE "${SINCE}", it is not a YYYY-MM-DD date`)
if (sinceDay) console.log(`gather: re-reading items published on or after ${sinceDay}, memory ignored for those`)

const newer = (item) => Boolean(sinceDay) && Boolean(isoDay(item.date)) && isoDay(item.date) >= sinceDay

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
    if (seen.has(item.url) && !newer(item)) {
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
