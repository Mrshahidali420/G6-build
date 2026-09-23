// The official videos read one second at a time, and read the other way up.
//
// src/data/trailers.json is the timestamped list of what each Rockstar video
// shows (built by scripts/import/trailers.mjs from the tigges/gta notes).
// src/data/camera-shots.json is where each of those shots was filmed from
// (gtamaplib). This file is the one place pages read them from, so the trailer
// pages and the entity pages can never disagree about what was shown when.
//
// A shot only ever links to an entity when trailers.json already carries the
// link AND that link is a live page here. Nothing is matched by guesswork.

import feed from '../data/trailers.json'
import cameras from '../data/camera-shots.json'
import { bySlug, urlFor } from './entities.mjs'

/** The name each video goes by in camera-shots.json and in running text. */
const SHORT_TITLE = {
  'trailer-1': 'Trailer 1',
  'trailer-2': 'Trailer 2',
  'extended-look': 'the Extended Look',
}

/** The same video's key in camera-shots.json "footage". */
const FOOTAGE = {
  'trailer-1': 'Trailer 1',
  'trailer-2': 'Trailer 2',
  'extended-look': 'Extended Look',
}

export const videos = feed.videos

export const trailerUrl = (id) => `/trailers/${id}`

export const shortTitle = (id) => SHORT_TITLE[id] ?? id

/** The anchor of one row on a trailer page, so a link can land on the second. */
export const shotAnchor = (seconds) => `t${seconds}`

/** A YouTube link that starts playing at the given second. */
export const youtubeAt = (video, seconds) =>
  `${video.url}${video.url.includes('?') ? '&' : '?'}t=${seconds}s`

/**
 * The source notes use long dashes as separators. Published copy on this site
 * carries none, so they become a comma. The words are otherwise untouched.
 */
export const cleanNote = (text) =>
  String(text ?? '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim()

/** "/characters/lucia-caminos" to its entity, only if that page really exists. */
function entityAt(url) {
  if (!url) return null
  const slug = String(url).split('/').pop()
  const entity = bySlug.get(slug)
  return entity && urlFor(entity) === url ? entity : null
}

/**
 * Every recorded moment of one video, in order, with the entity it links to
 * (or null). `href` is only ever set when `entity` is.
 */
export function shotsFor(videoId) {
  const video = videos.find((item) => item.id === videoId)
  if (!video) return []
  return video.events.map((event) => {
    const entity = entityAt(event.url)
    return {
      seconds: event.t,
      timestamp: event.at,
      anchor: shotAnchor(event.t),
      type: event.type,
      name: event.entity,
      note: cleanNote(event.note),
      confirmed: event.confidence === 'confirmed',
      entity,
      href: entity ? urlFor(entity) : null,
      youtube: youtubeAt(video, event.t),
    }
  })
}

/**
 * The solved camera positions for one video, in the order they appear in the
 * footage. A camera with no frame number sorts last. These carry no timestamp:
 * the survey counts frames, and turning a frame into a second would mean
 * guessing the frame rate.
 */
export function camerasFor(videoId) {
  const footage = FOOTAGE[videoId]
  if (!footage) return []
  return cameras.shots
    .filter((shot) => shot.footage === footage)
    .slice()
    .sort((a, b) => (a.frame ?? Infinity) - (b.frame ?? Infinity) || a.name.localeCompare(b.name))
}

/** The anchor a video's group of cameras has on /trailer-locations. */
export const cameraGroupUrl = (videoId) =>
  `/trailer-locations#${String(FOOTAGE[videoId] ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

// Built once: entity slug -> every moment it is linked from.
const byEntity = new Map()
for (const video of videos) {
  for (const shot of shotsFor(video.id)) {
    if (!shot.entity) continue
    const list = byEntity.get(shot.entity.slug) ?? []
    list.push({
      trailer: video.id,
      trailerTitle: video.title,
      shortTitle: shortTitle(video.id),
      url: `${trailerUrl(video.id)}#${shot.anchor}`,
      timestamp: shot.timestamp,
      seconds: shot.seconds,
      note: shot.note,
      youtube: shot.youtube,
      label: `Seen in ${shortTitle(video.id)} at ${shot.timestamp}`,
    })
    byEntity.set(shot.entity.slug, list)
  }
}

/**
 * Every moment an entity is linked from in the official videos, oldest video
 * first, then by second. An empty array when it was never linked.
 *
 *   shotsForEntity('lucia-caminos')[0]
 *   // { trailer: 'trailer-1', trailerTitle: 'Grand Theft Auto VI: Trailer 1',
 *   //   shortTitle: 'Trailer 1', url: '/trailers/trailer-1#t32',
 *   //   timestamp: '0:32', seconds: 32, note: '...', youtube: 'https://...',
 *   //   label: 'Seen in Trailer 1 at 0:32' }
 */
export function shotsForEntity(slug) {
  return (byEntity.get(slug) ?? []).map((row) => ({ ...row }))
}

/** How many moments across all videos link to a page here. */
export const linkedShotCount = [...byEntity.values()].reduce((total, list) => total + list.length, 0)
