// The song timing table: which song plays in which official video, at what
// second, over what scene.
//
// Every cell comes from data already on this site:
//   - the song rows in entities.json (their "Artist:", "Appeared in:" and
//     "Scene:" key facts, written from the cited press source), and
//   - the timestamped audio moments in trailers.json, when one links to the song.
// A cell the data does not fill says "not logged". Nothing is estimated.

import { entitiesOfType, urlFor } from './entities.mjs'
import { videos, shotsFor, trailerUrl } from './shots.mjs'
import { labelFor } from './evidence.mjs'

export const NOT_LOGGED = 'not logged'

const VIDEO_FOR = {
  'Trailer 1': 'trailer-1',
  'Trailer 2': 'trailer-2',
  'Extended Look': 'extended-look',
}

const factAfter = (entity, prefix) => {
  const hit = entity.keyFacts.find((fact) => fact.toLowerCase().startsWith(prefix.toLowerCase()))
  return hit ? hit.slice(prefix.length).trim() : null
}

// "0:06-0:45", "21:33-21:56", "25:44 to end"
const RANGE = /(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2}|end)/i

function artistOf(entity) {
  const named = factAfter(entity, 'Artists:') ?? factAfter(entity, 'Artist:')
  if (named) return named
  return entity.realWorldBasis ? entity.realWorldBasis.replace(/;\s*/g, ', ') : NOT_LOGGED
}

/** The moment trailers.json links to this song, if any. */
function audioMoment(entity) {
  for (const video of videos) {
    const shot = shotsFor(video.id).find((row) => row.type === 'audio' && row.entity?.slug === entity.slug)
    if (shot) return { video, shot }
  }
  return null
}

function timingFor(entity) {
  const appeared = factAfter(entity, 'Appeared in:') ?? ''
  const range = appeared.match(RANGE)
  if (range) {
    const end = range[2].toLowerCase() === 'end' ? 'end' : range[2]
    return { timestamp: `${range[1]} to ${end}`, from: 'press' }
  }
  const moment = audioMoment(entity)
  if (moment) return { timestamp: moment.shot.timestamp, from: 'index', anchor: moment.shot.anchor }
  return { timestamp: NOT_LOGGED, from: null }
}

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1)

function sceneFor(entity) {
  const scene = factAfter(entity, 'Scene:')
  if (scene) return capital(scene)
  // "GTA VI Trailer 2 (May 6, 2026), heard briefly on car radio": keep only the
  // words after the bracket, never the date, which is the video's job to state.
  const appeared = factAfter(entity, 'Appeared in:') ?? ''
  const tail = appeared.split(/\)\s*,\s*/)[1]
  if (tail && !RANGE.test(tail)) return capital(tail)
  return NOT_LOGGED
}

/**
 * One row per song, ordered by video (oldest first) then by start time.
 *   { entity, name, href, artist, videoId, videoTitle, videoHref,
 *     timestamp, scene, evidence, timingFrom }
 */
export function songTimings() {
  const order = videos.map((video) => video.id)
  const toSeconds = (stamp) => {
    const match = String(stamp).match(/^(\d{1,2}):(\d{2})/)
    return match ? Number(match[1]) * 60 + Number(match[2]) : Infinity
  }

  return entitiesOfType('song')
    .map((entity) => {
      const videoId = VIDEO_FOR[entity.firstShownIn] ?? null
      const video = videos.find((item) => item.id === videoId) ?? null
      const timing = timingFor(entity)
      return {
        entity,
        name: entity.name,
        href: urlFor(entity),
        artist: artistOf(entity),
        videoId,
        videoTitle: video ? video.title.replace(/^Grand Theft Auto VI:\s*/, '') : NOT_LOGGED,
        videoHref: video
          ? `${trailerUrl(video.id)}${timing.anchor ? `#${timing.anchor}` : ''}`
          : null,
        timestamp: timing.timestamp,
        timingFrom: timing.from,
        scene: sceneFor(entity),
        evidence: labelFor(entity),
      }
    })
    .sort((a, b) =>
      (order.indexOf(a.videoId) + 1 || 99) - (order.indexOf(b.videoId) + 1 || 99) ||
      toSeconds(a.timestamp) - toSeconds(b.timestamp) ||
      a.name.localeCompare(b.name),
    )
}

/** Song slugs the data gives no timestamp for. */
export const songsWithoutTiming = () =>
  songTimings().filter((row) => row.timestamp === NOT_LOGGED).map((row) => row.entity.slug)

/** Songs heard on a given video, for the trailer pages. */
export const songsOn = (videoId) => songTimings().filter((row) => row.videoId === videoId)
