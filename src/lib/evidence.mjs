// The evidence label: one short answer to "how do we know this?", shown on a
// row before anybody reads it.
//
// It is worked out from fields the record already stores. Nothing here decides
// that a thing is true. The provenance mark (Mark.astro) says how sure the
// site is about an entity. This label says what KIND of evidence sits behind a
// row, so an entity, a tracker claim and a robot claim can all be read on the
// same scale.
//
// Render it with src/components/Evidence.astro. The tone is the .mark--*
// modifier in src/styles/world.css, so shape, icon and words carry the meaning
// and colour only reinforces it.

import { shotsForEntity } from './shots.mjs'

export const EVIDENCE = Object.freeze({
  official: Object.freeze({
    key: 'official',
    text: 'Official',
    tone: 'confirmed',
    icon: 'confirmed',
    means: 'Rockstar Games or Take-Two said or published this themselves.',
  }),
  seen: Object.freeze({
    key: 'seen',
    text: 'Seen in trailer',
    tone: 'seen',
    icon: 'play',
    means: 'Visible in an official Rockstar video. Rockstar has not described it in words.',
  }),
  heard: Object.freeze({
    key: 'heard',
    text: 'Heard in trailer',
    tone: 'seen',
    icon: 'play',
    means: 'Plays in an official Rockstar video and was named by the press. Rockstar has not published a track list.',
  }),
  screenshot: Object.freeze({
    key: 'screenshot',
    text: 'Seen in screenshot',
    tone: 'seen',
    icon: 'play',
    means: 'Visible in an official Rockstar screenshot. Rockstar has not described it in words.',
  }),
  press: Object.freeze({
    key: 'press',
    text: 'Reported by press',
    tone: 'press',
    icon: 'press',
    means: 'A games outlet reported this. Rockstar has not confirmed it.',
  }),
  community: Object.freeze({
    key: 'community',
    text: 'Community, unverified',
    tone: 'community',
    icon: 'community',
    means: 'Identified by fans, mostly on the GTA Fandom wiki. Neither Rockstar nor the press has confirmed it.',
  }),
  leak: Object.freeze({
    key: 'leak',
    text: 'Leak, unverified',
    tone: 'none',
    icon: 'none',
    means: 'Rests on material Rockstar did not publish. Nothing leaked is stored or linked here.',
  }),
  unverified: Object.freeze({
    key: 'unverified',
    text: 'Unverified',
    tone: 'none',
    icon: 'none',
    means: 'Posted by a member of the public. Nobody with standing has backed it up.',
  }),
})

/** Strongest evidence first. Use it to order chips, legends and counts. */
export const EVIDENCE_ORDER = Object.freeze([
  'official', 'seen', 'heard', 'screenshot', 'press', 'community', 'leak', 'unverified',
])

const VIDEOS = new Set(['Trailer 1', 'Trailer 2', 'Extended Look'])
const STILLS = new Set(['Screenshots', 'Official Screenshots'])
const CLAIM_STATUSES = new Set(['CONFIRMED', 'RUMOR', 'LEAK', 'UNKNOWN'])

const withDetail = (entry, detail = null) => ({ ...entry, detail })

/** An entity row from src/data/entities.json. */
function forEntity(entity) {
  if (entity.confirmedStatus === 'OFFICIAL_CONFIRMED' || entity.sourceTier === 'TIER_1_OFFICIAL') {
    return withDetail(EVIDENCE.official)
  }

  const shots = entity.slug ? shotsForEntity(entity.slug) : []
  if (shots.length || VIDEOS.has(entity.firstShownIn)) {
    const detail = shots.length ? shots[0].label.replace(/^Seen in /, '') : entity.firstShownIn
    return withDetail(entity.entityType === 'song' ? EVIDENCE.heard : EVIDENCE.seen, detail)
  }
  if (STILLS.has(entity.firstShownIn)) return withDetail(EVIDENCE.screenshot, 'Official screenshots')

  if (entity.confirmedStatus === 'PRESS_REPORTED' || entity.sourceTier === 'TIER_2_MAJOR_PRESS') {
    return withDetail(EVIDENCE.press)
  }
  if (entity.confirmedStatus === 'COMMUNITY_IDENTIFIED' || entity.sourceTier === 'TIER_3_COMMUNITY') {
    return withDetail(EVIDENCE.community)
  }
  return withDetail(EVIDENCE.unverified)
}

/** A claim from the tracker collection (src/content/tracker), by its data. */
function forTrackerClaim(data) {
  const kind = data.source?.kind
  const label = data.source?.label ?? null
  if (kind === 'official') return withDetail(EVIDENCE.official, label)
  if (data.status === 'LEAK') return withDetail(EVIDENCE.leak, label)
  if (kind === 'press') return withDetail(EVIDENCE.press, label)
  return withDetail(EVIDENCE.unverified, label)
}

/** A robot claim row from allClaims() in src/lib/tracker.mjs. */
function forRobotClaim(row) {
  if (row.tier === 'TIER_1_OFFICIAL') return withDetail(EVIDENCE.official, row.outlet ?? null)
  if (row.tier === 'TIER_2_MAJOR_PRESS') return withDetail(EVIDENCE.press, row.outlet ?? null)
  if (row.tier === 'TIER_3_COMMUNITY') return withDetail(EVIDENCE.community, row.outlet ?? null)
  return withDetail(EVIDENCE.unverified, row.outlet ?? null)
}

/**
 * The evidence label for any row the site shows.
 *
 * Accepts an entity (entities.json), a tracker collection entry or its
 * `data`, or a robot claim row from tracker.mjs. Returns a new object:
 *   { key, text, tone, icon, means, detail }
 * `detail` is a short extra line ("Trailer 2 at 1:42", "r/GTA6, Reddit") or null.
 */
export function labelFor(item) {
  if (!item || typeof item !== 'object') return withDetail(EVIDENCE.unverified)
  const data = item.data && typeof item.data === 'object' ? item.data : item

  if (CLAIM_STATUSES.has(data.status) && data.source) return forTrackerClaim(data)
  if (data.tier && data.fact !== undefined) return forRobotClaim(data)
  if (data.confirmedStatus || data.sourceTier) return forEntity(data)
  return withDetail(EVIDENCE.unverified)
}

/** Count a list by evidence key, in EVIDENCE_ORDER, dropping empty keys. */
export function countByEvidence(items) {
  const counts = new Map()
  for (const item of items) {
    const key = labelFor(item).key
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return EVIDENCE_ORDER.filter((key) => counts.has(key)).map((key) => ({
    ...EVIDENCE[key],
    count: counts.get(key),
  }))
}
