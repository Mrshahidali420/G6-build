// Album covers and 30 second previews for the song entries.
//
// Every song on this site is a real commercial record, so the site may not host
// the audio and may not host the cover art either. Apple's public iTunes Search
// endpoint answers with both: a cover image URL on Apple's own servers and a 30
// second preview MP3 on Apple's own servers. Nothing copyrighted is copied here.
// The page hotlinks Apple and Apple serves it, which is what that endpoint is
// published for.
//
// The result is cached in data/music.json, which IS checked in. A build never
// depends on the network: a slug already in the cache is left alone, and a
// failed lookup is recorded as a miss rather than crashing the build. Run
//
//   node scripts/build-music.mjs --refresh
//
// to look every song up again from scratch.
//
// Matching is checked, not trusted. Apple returns its best guess for any query,
// so a returned track whose title does not line up with ours is thrown away and
// logged as a miss. A wrong cover on a sourced-facts site is worse than none.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTITIES = join(ROOT, 'src', 'data', 'entities.json')
const CACHE = join(ROOT, 'data', 'music.json')
const ENDPOINT = 'https://itunes.apple.com/search'
const ART_SIZE = '600x600bb'
const PAUSE_MS = 400

const refresh = process.argv.includes('--refresh')

const today = () => new Date().toISOString().slice(0, 10)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// "Artists: Sexyy Red featuring Tay Keith" -> "Sexyy Red". A featured name in
// the query pushes Apple towards the wrong record more often than it helps.
// Apple files two of these acts under a different spelling of the same name.
// Both spellings are the act's own: "!!!" is the band's name and "Chk Chk Chk"
// is how it is pronounced. Nothing here invents a credit.
const ARTIST_ALIAS = {
  '!!! (chk chk chk)': '!!!',
}

const artistFrom = (entity) => {
  const fact = (entity.keyFacts ?? []).find((line) => /^artists?\s*:/i.test(line))
  if (!fact) return null
  return fact
    .replace(/^artists?\s*:\s*/i, '')
    .split(/\s+(?:featuring|feat\.?|ft\.?|with)\s+/i)[0]
    .trim()
}

const aliased = (artist) => ARTIST_ALIAS[artist.toLowerCase()] ?? artist

// Loose enough to survive "Se Me Nota (Agarrame)" against "Se Me Nota", strict
// enough to reject a different song by the same artist.
const bare = (text) =>
  String(text)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/ and /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const titlesAgree = (ours, theirs) => {
  const a = bare(ours)
  const b = bare(theirs)
  if (!a || !b) return false
  return a === b || a.startsWith(b) || b.startsWith(a)
}

const artistsAgree = (ours, theirs) => {
  const a = bare(ours)
  const b = bare(theirs)
  // A band whose whole name is punctuation, like !!!, strips to nothing. Those
  // two names are compared as written instead of being thrown away.
  if (!a || !b) return ours.trim().toLowerCase() === theirs.trim().toLowerCase()
  return b.includes(a) || a.includes(b)
}

const lookUp = async (name, rawArtist) => {
  const artist = aliased(rawArtist)
  const term = `${artist} ${name}`.replace(/\s+/g, ' ').trim()
  const url = `${ENDPOINT}?term=${encodeURIComponent(term)}&entity=song&limit=5`
  const response = await fetch(url, { headers: { 'user-agent': 'gta6record (+https://gta6record.com)' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = await response.json()
  const hit = (body.results ?? []).find(
    (track) => titlesAgree(name, track.trackName) && artistsAgree(artist, track.artistName),
  )
  if (!hit) return null
  return {
    trackName: hit.trackName,
    artistName: hit.artistName,
    albumName: hit.collectionName ?? null,
    releaseYear: hit.releaseDate ? hit.releaseDate.slice(0, 4) : null,
    artwork: hit.artworkUrl100 ? hit.artworkUrl100.replace(/100x100bb\./, `${ART_SIZE}.`) : null,
    preview: hit.previewUrl ?? null,
    appleUrl: hit.trackViewUrl ?? null,
    checked: today(),
  }
}

const entities = JSON.parse(readFileSync(ENTITIES, 'utf8'))
const songs = entities.filter((entity) => entity.entityType === 'song')

let cache = {}
if (!refresh && existsSync(CACHE)) {
  try { cache = JSON.parse(readFileSync(CACHE, 'utf8')) } catch { cache = {} }
}

let added = 0
let missed = 0
let kept = 0

for (const song of songs) {
  if (cache[song.slug] && cache[song.slug].artwork) { kept += 1; continue }

  const artist = artistFrom(song)
  if (!artist) {
    console.log(`[music] ${song.slug}: no artist in key facts, skipped`)
    missed += 1
    continue
  }

  try {
    const match = await lookUp(song.name, artist)
    if (match) {
      cache[song.slug] = match
      added += 1
      console.log(`[music] ${song.slug}: ${match.artistName} / ${match.trackName}`)
    } else {
      missed += 1
      console.log(`[music] ${song.slug}: no confident match for "${artist} ${song.name}"`)
    }
  } catch (error) {
    missed += 1
    console.log(`[music] ${song.slug}: lookup failed, ${error.message}`)
  }

  await sleep(PAUSE_MS)
}

const ordered = {}
for (const key of Object.keys(cache).sort()) ordered[key] = cache[key]
writeFileSync(CACHE, `${JSON.stringify(ordered, null, 2)}\n`)

console.log(`[music] ${songs.length} songs, ${kept} already cached, ${added} new, ${missed} without a match`)
