// Lane two: Rockstar's own Newswire.
//
// The Newswire is rendered in the browser, so a plain fetch returns an empty
// shell. This lane drives a headless Chromium instead, reads the article links
// the page actually shows, and hands the matching ones to the same saveRaw the
// RSS lane uses. It writes no prose either.
//
// It must never fail the run. Playwright missing, a browser that will not
// start, a page that never loads: each prints a line and exits 0. Rockstar
// posting nothing for a month is the normal case, not an error.
//
// Run: node scripts/robot/newswire.mjs

import { MATCH, NEWSWIRE_SOURCE } from './sources.mjs'
import { MAX_NEW_PER_RUN, clean, loadSeen, saveRaw, saveSeen } from './lib.mjs'

let chromium = null
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.log('newswire: playwright is not installed, skipping this lane')
  process.exit(0)
}

let browser = null
let links = []

try {
  browser = await chromium.launch()
  const page = await browser.newPage({ userAgent: 'gta6record-robot (+https://gta6record.com)' })
  await page.goto(NEWSWIRE_SOURCE.page, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('a[href*="/newswire/article/"]', { timeout: 30000 })
  links = await page.$$eval('a[href*="/newswire/article/"]', (nodes) =>
    nodes.map((node) => ({ url: node.href, title: (node.innerText || node.textContent || '').trim() })),
  )
} catch (error) {
  console.log(`newswire: could not read the page, skipping this lane (${error.message})`)
  if (browser) await browser.close().catch(() => {})
  process.exit(0)
}

await browser.close().catch(() => {})

// One link can appear twice on the page, once as the image and once as the
// headline. Keep the copy that carries visible words.
const byUrl = new Map()
for (const link of links) {
  const url = link.url.split('#')[0].split('?')[0]
  const title = clean(link.title)
  if (!/^https:\/\/www\.rockstargames\.com\/newswire\/article\//.test(url)) continue
  if (!byUrl.has(url) || (title && !byUrl.get(url))) byUrl.set(url, title)
}

console.log(`newswire: ${byUrl.size} article links on the page`)

const seen = await loadSeen()
let saved = 0

for (const [url, title] of byUrl) {
  if (!MATCH.test(title)) continue
  if (seen.has(url)) {
    seen.add(url)
    continue
  }
  seen.add(url)
  if (saved >= MAX_NEW_PER_RUN) {
    console.log(`newswire: cap reached, ${MAX_NEW_PER_RUN} new items this run`)
    break
  }
  const record = await saveRaw({ source: NEWSWIRE_SOURCE, url, title })
  if (record) {
    saved += 1
    console.log(`  saved ${record.id} (published ${record.published ?? 'date unknown'})`)
  }
}

for (const url of byUrl.keys()) seen.add(url)
await saveSeen(seen)

console.log(`newswire: ${saved} new raw files written`)
