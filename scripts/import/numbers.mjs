/**
 * Builds the three number series behind /numbers.
 *
 * This site is mostly lists of things. This is the one part that is measured
 * rather than listed, and every series here can be checked by anyone against
 * a public source:
 *
 *   1. Take-Two share price, monthly close since 2011. Yahoo Finance.
 *   2. Search interest for five GTA 6 phrases, monthly since 2020. Google
 *      Trends, which reports a 0 to 100 index and not a count of searches.
 *   3. Views on each official video, sampled roughly daily since May 2026.
 *
 * The series are read from the tigges/gta project, which collects them.
 *
 * One thing is deliberately not carried over. That project marks its share
 * price chart with ten dated events, and three of them disagree with the
 * Rockstar Newswire: it puts the delay to 2026 at 12 February 2025 and the
 * November date at 27 March 2026, where Rockstar announced them on 2 May 2025
 * and 6 November 2025. So the markers are dropped and rebuilt from
 * src/data/newswire.json, which is this site's tier 1 record. A chart of what
 * announcements did to the share price is only worth reading if the
 * announcement dates are the real ones.
 *
 * Reddit subscriber counts are in that project too and are not used here. They
 * are hand entered with no source, and the file says the live counter needs
 * credentials nobody has.
 *
 * The source repo is not inside this repo, so the output file is committed.
 * Cloudflare cannot rebuild it.
 *
 *   node scripts/import/numbers.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, '..', 'gta6-src', 'tigges-gta', 'data')
const OUT = join(ROOT, 'src', 'data', 'numbers.json')

const STOCK = join(SRC, 'franchise', 'ttwo-stock.json')
const TRENDS = join(SRC, 'gta-6', 'trends', 'search-interest.json')
const VELOCITY = join(SRC, 'gta-6', 'trailer-velocity.json')
const NEWSWIRE = join(ROOT, 'src', 'data', 'newswire.json')

for (const path of [STOCK, TRENDS, VELOCITY, NEWSWIRE]) {
  if (existsSync(path)) continue
  console.error(`[numbers] cannot find ${path}`)
  console.error('[numbers] the reference clone is expected at ../gta6-src/tigges-gta')
  process.exit(1)
}

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
const today = new Date().toISOString().slice(0, 10)

/* ---------------------------------------------------------------- share price */

const stockRaw = read(STOCK)
const prices = (stockRaw.prices || [])
  .filter((row) => row.date && Number(row.close) > 0)
  .map((row) => ({ date: String(row.date).slice(0, 10), close: Number(row.close) }))
  .sort((a, b) => a.date.localeCompare(b.date))

/**
 * Short labels for the Newswire posts that are worth marking on a share price
 * chart. Keyed by article slug. A post not in here is a real post that simply
 * does not need a marker, like the day-before pre-order reminder.
 */
const MARKS = {
  'grand-theft-auto-vi-watch-trailer-1-now': 'Trailer 1',
  'grand-theft-auto-vi-is-now-coming-may-26-2026': 'Delayed to May 2026',
  'grand-theft-auto-vi-watch-trailer-2-now': 'Trailer 2',
  'grand-theft-auto-vi-is-now-set-to-launch-november-19-2026': 'Delayed to Nov 2026',
  'grand-theft-auto-vi-pre-orders-begin-on-june-25': 'Pre-orders announced',
  'grand-theft-auto-vi-an-extended-look-now-playing': 'Extended Look',
  'announcing-grand-theft-auto-vi-the-album-coming-november-19': 'Soundtrack announced',
}

const newswire = read(NEWSWIRE)
const firstMonth = prices[0]?.date.slice(0, 7)
const lastMonth = prices[prices.length - 1]?.date.slice(0, 7)

const marks = newswire.posts
  .filter((post) => MARKS[post.slug] && post.date)
  .map((post) => ({ date: post.date, label: MARKS[post.slug], url: post.url, slug: post.slug }))
  .filter((mark) => mark.date.slice(0, 7) >= firstMonth && mark.date.slice(0, 7) <= lastMonth)
  .sort((a, b) => a.date.localeCompare(b.date))

/** Share price at the monthly close on or after a Newswire date. */
function closeNear(date) {
  const month = date.slice(0, 7)
  const hit = prices.find((row) => row.date.slice(0, 7) >= month)
  return hit ? hit.close : null
}
for (const mark of marks) mark.close = closeNear(mark.date)

/* -------------------------------------------------------------- search trends */

const trendsRaw = read(TRENDS)
const trends = (trendsRaw.keywords || []).map((item) => ({
  keyword: item.keyword,
  peak: Math.max(...item.data.map((point) => Number(point.value) || 0)),
  points: item.data.map((point) => ({ date: point.date, value: Number(point.value) || 0 })),
}))

/** The single month the top phrase peaked in. That month is the story. */
const top = trends[0]
const peakMonth = top ? top.points.find((point) => point.value === top.peak)?.date : null

/* ---------------------------------------------------------------- video views */

const TITLES = {
  'QdBZY2fkU-0': 'Trailer 1',
  VQRLujxTm3c: 'Trailer 2',
  tJbzMqJGH4k: 'An Extended Look',
  qq76pQsI1iw: 'Extended Look teaser',
}
const PUBLISHED = {
  'QdBZY2fkU-0': '2023-12-04',
  VQRLujxTm3c: '2025-05-06',
  tJbzMqJGH4k: '2026-08-27',
  qq76pQsI1iw: '2026-08-06',
}

const velocityRaw = read(VELOCITY)
const videos = (velocityRaw.trailers || [])
  .map((item) => {
    const snaps = (item.snapshots || [])
      .filter((snap) => snap.timestamp && Number(snap.views) > 0)
      .map((snap) => ({ date: String(snap.timestamp).slice(0, 10), views: Number(snap.views) }))
      .sort((a, b) => a.date.localeCompare(b.date))
    if (snaps.length < 2) return null
    const first = snaps[0]
    const last = snaps[snaps.length - 1]
    const days = Math.max(
      1,
      Math.round((new Date(last.date) - new Date(first.date)) / 86_400_000),
    )
    return {
      youtubeId: item.youtube_id,
      title: TITLES[item.youtube_id] || item.title,
      publishedAt: PUBLISHED[item.youtube_id] || null,
      url: `https://www.youtube.com/watch?v=${item.youtube_id}`,
      views: last.views,
      readOn: last.date,
      since: first.date,
      samples: snaps.length,
      /** Views added per day across the sampled window, rounded. */
      perDay: Math.round((last.views - first.views) / days),
      points: snaps,
    }
  })
  .filter(Boolean)
  .sort((a, b) => b.views - a.views)

/* --------------------------------------------------------------------- write */

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify(
    {
      built: today,
      sourceProject: 'https://github.com/tigges/gta',
      stock: {
        symbol: stockRaw.symbol || 'TTWO',
        currency: stockRaw.currency || 'USD',
        source: 'Yahoo Finance, monthly closing price',
        note: 'Markers are the Rockstar Newswire posts, not this series own event list.',
        from: prices[0]?.date || null,
        to: prices[prices.length - 1]?.date || null,
        low: Math.min(...prices.map((row) => row.close)),
        high: Math.max(...prices.map((row) => row.close)),
        latest: prices[prices.length - 1]?.close || null,
        points: prices,
        marks,
      },
      trends: {
        source: 'Google Trends',
        note: 'Google Trends reports a 0 to 100 index of relative interest, not a count of searches. 100 is the busiest month for the busiest phrase.',
        from: top?.points[0]?.date || null,
        to: top?.points[top.points.length - 1]?.date || null,
        peakMonth,
        keywords: trends,
      },
      videos: {
        source: 'Public YouTube view counters, sampled roughly once a day',
        note: 'Counts are what YouTube showed on the day it was read, not an official Rockstar figure.',
        total: videos.reduce((sum, video) => sum + video.views, 0),
        readOn: videos.map((video) => video.readOn).sort().pop() || null,
        items: videos,
      },
    },
    null,
    2,
  ) + '\n',
)

console.log(`[numbers] share price: ${prices.length} months, ${prices[0]?.date} to ${prices[prices.length - 1]?.date}`)
console.log(`[numbers] share price: ${marks.length} markers rebuilt from the Newswire record`)
for (const mark of marks) console.log(`[numbers]   ${mark.date} ${mark.label} at $${mark.close}`)
console.log(`[numbers] trends: ${trends.length} phrases, ${top?.points.length} months, peak ${peakMonth}`)
console.log(`[numbers] videos: ${videos.length} videos, ${videos.reduce((sum, v) => sum + v.views, 0).toLocaleString('en-US')} views total`)
console.log('[numbers] wrote src/data/numbers.json')
