/**
 * Records what appears, and at what second, in each official GTA 6 video.
 *
 * Rockstar has published four videos: Trailer 1, Trailer 2, the Extended Look
 * teaser and the Extended Look itself. Those videos are the largest source of
 * confirmed material this site has. Almost everything recorded here that did
 * not come from a Newswire post came from a frame of one of them.
 *
 * So this builds the index of that: a timestamp, what is on screen at that
 * timestamp, and whether the sighting is solid or only reported. A reader can
 * then check any claim on this site against the second of video it came from.
 *
 * The timings and the notes are from the tigges/gta project, which watched the
 * videos frame by frame and wrote them down. The view counts are from the same
 * project, which has been sampling the YouTube counters since May 2026.
 *
 * Every entity name is matched against the entity record already on this site.
 * A match becomes a link to that page. A name with no match still lists, it
 * just lists without a link, because the video still showed the thing.
 *
 * The source repo is not inside this repo, so the output file is committed.
 * Cloudflare cannot rebuild it.
 *
 *   node scripts/import/trailers.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, '..', 'gta6-src', 'tigges-gta', 'data', 'gta-6')
const OUT = join(ROOT, 'src', 'data', 'trailers.json')

const ANALYSIS = join(SRC, 'trailer-analysis.json')
const VELOCITY = join(SRC, 'trailer-velocity.json')

if (!existsSync(ANALYSIS)) {
  console.error(`[trailers] cannot find ${ANALYSIS}`)
  console.error('[trailers] the reference clone is expected at ../gta6-src/tigges-gta')
  process.exit(1)
}

/** entityType in the data to the hub folder the page sits in. */
const HUB_OF = {
  character: 'characters',
  vehicle: 'vehicles',
  location: 'locations',
  song: 'soundtrack',
  business: 'businesses',
  brand: 'brands',
  landmark: 'landmarks',
  weapon: 'weapons',
  gameplay_feature: 'gameplay',
  edition: 'editions',
  wildlife: 'wildlife',
}

const norm = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * What a sighting of each kind is allowed to link to.
 *
 * Without this the matcher does real damage. "Hammerhead Shark" finds a
 * business called Shark, "Benefactor Schafter" finds the manufacturer rather
 * than the car, and "Heel Stabbing (Lucia)" finds Lucia. A wrong link is worse
 * than no link, so a sighting may only link to a page of a matching kind.
 */
const ALLOWED = {
  character: ['character'],
  vehicle: ['vehicle'],
  location: ['location', 'landmark'],
  weapon: ['weapon'],
  wildlife: ['wildlife'],
  audio: ['song'],
  reveal: ['gameplay_feature'],
}

/**
 * Builds one lookup per entity kind, from every name and alternate name on
 * the site to its page.
 */
function buildIndex() {
  const path = join(ROOT, 'src', 'data', 'entities.json')
  if (!existsSync(path)) {
    console.error('[trailers] src/data/entities.json is missing. Run npm run build:data first.')
    process.exit(1)
  }
  const entities = JSON.parse(readFileSync(path, 'utf8'))
  const byKind = new Map()
  for (const entity of entities) {
    const hub = HUB_OF[entity.entityType]
    if (!hub) continue
    if (!byKind.has(entity.entityType)) byKind.set(entity.entityType, new Map())
    const table = byKind.get(entity.entityType)
    const target = { name: entity.name, url: `/${hub}/${entity.slug}` }
    for (const name of [entity.name, ...(entity.altNames || [])]) {
      const key = norm(name)
      if (key && !table.has(key)) table.set(key, target)
    }
  }
  return byKind
}

const index = buildIndex()

/**
 * Finds the page for a name written in a trailer note, or null.
 *
 * The exact name is tried first, then two looser passes, because the notes are
 * written loosely in both directions.
 *
 * The note can carry extra words: "Vice City downtown" and "Port Gellhorn
 * Marina". So the longest inner run of words is tried, longest first. The run
 * must be two words or more. A single word is never tried, because that is
 * what turned "Combat Pistol" into the page for Pistol, which is a different
 * gun.
 *
 * Or the note can be shorter than the name: "Mount Kalaga" for the page called
 * Mount Kalaga National Park. So a note that begins a name is accepted, but
 * only when exactly one page starts that way.
 */
function linkFor(name, kind) {
  const key = norm(name)
  if (!key) return null
  const tables = (ALLOWED[kind] || []).map((type) => index.get(type)).filter(Boolean)
  if (!tables.length) return null
  for (const table of tables) if (table.has(key)) return table.get(key)

  const words = key.split(' ')
  for (let size = words.length - 1; size >= 2; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const slice = words.slice(start, start + size).join(' ')
      for (const table of tables) if (table.has(slice)) return table.get(slice)
    }
  }

  const starts = []
  for (const table of tables) {
    for (const [entry, target] of table) {
      if (entry.startsWith(`${key} `)) starts.push(target)
    }
  }
  const unique = new Set(starts.map((target) => target.url))
  return unique.size === 1 ? starts[0] : null
}

/** "1609" seconds as "26:49", or "91" as "1:31". */
function clock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

const analysis = JSON.parse(readFileSync(ANALYSIS, 'utf8'))
const velocity = existsSync(VELOCITY) ? JSON.parse(readFileSync(VELOCITY, 'utf8')) : { trailers: [] }

/** Latest non zero view count per video, with the day it was read. */
const counts = new Map()
for (const item of velocity.trailers || []) {
  const snaps = (item.snapshots || []).filter((snap) => Number(snap.views) > 0)
  if (!snaps.length) continue
  const last = snaps[snaps.length - 1]
  const first = snaps[0]
  counts.set(item.youtube_id, {
    views: Number(last.views),
    likes: Number(last.likes) || null,
    readOn: String(last.timestamp || '').slice(0, 10),
    since: String(first.timestamp || '').slice(0, 10),
    samples: snaps.length,
  })
}

const today = new Date().toISOString().slice(0, 10)
let linked = 0
let unlinked = 0

const videos = (analysis.trailers || [])
  .filter((item) => item.youtube_id && (item.events || []).length)
  .map((item) => {
    const events = [...item.events]
      .sort((a, b) => Number(a.t) - Number(b.t))
      .map((event) => {
        const link = linkFor(event.entity, event.type)
        if (link) linked += 1
        else unlinked += 1
        return {
          t: Number(event.t) || 0,
          at: clock(event.t),
          type: String(event.type || 'reveal'),
          entity: String(event.entity || '').trim(),
          confidence: String(event.confidence || 'reported'),
          note: String(event.note || '').trim(),
          url: link ? link.url : null,
        }
      })
    const byType = {}
    for (const event of events) byType[event.type] = (byType[event.type] || 0) + 1
    return {
      id: item.id,
      youtubeId: item.youtube_id,
      title: String(item.title || '').replace(/\s*[—-]\s*/, ': '),
      publishedAt: item.published_at,
      durationSec: Number(item.duration_sec) || 0,
      runtime: clock(item.duration_sec),
      url: `https://www.youtube.com/watch?v=${item.youtube_id}`,
      counts: counts.get(item.youtube_id) || null,
      eventCount: events.length,
      confirmedCount: events.filter((event) => event.confidence === 'confirmed').length,
      byType,
      events,
    }
  })
  .sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)))

const allEvents = videos.flatMap((video) => video.events)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'Official Rockstar Games trailers and the Extended Look, watched frame by frame',
      sourceProject: 'https://github.com/tigges/gta',
      method:
        'Timestamps and notes are read from the tigges/gta trailer analysis. View counts are that project’s samples of the public YouTube counters. Entity names are matched against the record already on this site, and a match becomes a link. No video or frame is copied here.',
      built: today,
      counts: {
        videos: videos.length,
        events: allEvents.length,
        confirmed: allEvents.filter((event) => event.confidence === 'confirmed').length,
        linked,
      },
      videos,
    },
    null,
    2,
  ) + '\n',
)

console.log(`[trailers] ${videos.length} videos, ${allEvents.length} timestamped sightings`)
console.log(`[trailers] ${linked} matched a page on this site, ${unlinked} did not`)
for (const video of videos) {
  const seen = video.counts ? `${video.counts.views.toLocaleString('en-US')} views` : 'no view count'
  console.log(`[trailers]   ${video.publishedAt} ${video.runtime} ${video.eventCount} sightings, ${seen}`)
}
console.log('[trailers] wrote src/data/trailers.json')
