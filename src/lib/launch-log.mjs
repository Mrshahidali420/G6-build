// The launch-week log on /gta-6-launch. Read from src/data/launch-log.json.
//
// Every entry must carry a real date and a real source. A log line with no
// source is rumour, and this site does not print rumour, so a bad entry stops
// the build instead of shipping. The checks run when the page imports this
// file, which is during `astro build`.
import raw from '../data/launch-log.json'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

function fail(index, why) {
  throw new Error(`src/data/launch-log.json entry ${index + 1}: ${why}`)
}

function check(entry, index) {
  if (!entry || typeof entry !== 'object') fail(index, 'is not an object')
  if (!DATE.test(entry.date ?? '')) fail(index, 'date must look like 2026-11-19')
  if (entry.time_utc !== undefined && !TIME.test(entry.time_utc)) fail(index, 'time_utc must look like 05:00')
  if (typeof entry.text !== 'string' || entry.text.trim().length < 10) fail(index, 'text is missing or too short')
  if (/—/.test(entry.text)) fail(index, 'text has an em dash; use a comma or a full stop')
  const source = entry.source
  if (!source || typeof source.label !== 'string' || !source.label.trim()) fail(index, 'source.label is missing')
  if (typeof source.url !== 'string' || !/^https:\/\/\S+$/.test(source.url)) fail(index, 'source.url must be a full https link')
  return {
    date: entry.date,
    time_utc: entry.time_utc ?? null,
    text: entry.text.trim(),
    source: { label: source.label.trim(), url: source.url },
  }
}

if (!Array.isArray(raw)) throw new Error('src/data/launch-log.json must be a JSON array')

// Newest first, whatever order the file was written in. Same day sorts by time.
const key = (entry) => `${entry.date}T${entry.time_utc ?? '00:00'}`
export const LAUNCH_LOG = raw.map(check).sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0))
