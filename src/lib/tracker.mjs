// Every claim the robot has recorded, in one list, with the mark that says how
// well sourced it is.
//
// The entity pages each show their own claims and nothing else, so a reader who
// wants to know what is settled and what is still only reported has to open
// twenty pages to find out. This is that same evidence read the other way up:
// one row per claim, newest first, each one naming the outlet and linking to it.
//
// The source is data/robot/claims/*.json, written by the robot and checked in,
// so a build never needs the network. Nothing here decides that a claim is
// true. It only records who said it and how good the source was.

import fs from 'node:fs'
import path from 'node:path'
import { stripPageChrome, quotableSentence } from '../../scripts/robot/logic.mjs'
import { HUB_TYPES } from './site.mjs'
import { bySlug, pageEntities, urlFor } from './entities.mjs'

const dir = path.join(process.cwd(), 'data', 'robot', 'claims')

const readAll = () => {
  let names = []
  try {
    names = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
  } catch {
    return []
  }
  return names.flatMap((name) => {
    try {
      return [JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))]
    } catch {
      return []
    }
  })
}

const hubSlugFor = (entityType) => HUB_TYPES.find((hub) => hub.type === entityType)?.slug ?? null

// A claim is confirmed only when the source is Rockstar or Take-Two themselves.
// Anything a magazine reported stays reported, however sure the magazine sounded.
export const statusForTier = (tier) =>
  tier === 'TIER_1_OFFICIAL' ? 'OFFICIAL_CONFIRMED' : 'PRESS_REPORTED'

/**
 * One flat list of claims, newest first, with the same page furniture guards
 * the robot applies when it writes an entity file. Two outlets often print the
 * same sentence, so the first one to say it keeps the row.
 */
export function allClaims() {
  const rows = []
  const seen = new Set()

  for (const record of readAll()) {
    for (const entity of record.entities ?? []) {
      for (const claim of entity.claims ?? []) {
        const fact = stripPageChrome(claim.fact ?? '')
        if (!quotableSentence(fact)) continue

        const key = fact.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
        if (seen.has(key)) continue
        seen.add(key)

        const hub = hubSlugFor(entity.entityType)
        const href = hub && bySlug.has(entity.slug) ? `/${hub}/${entity.slug}` : null

        rows.push({
          fact,
          quote: stripPageChrome(claim.quote ?? claim.fact ?? ''),
          subject: entity.name,
          subjectHref: href,
          entityType: entity.entityType,
          outlet: record.outlet,
          tier: record.tier,
          status: statusForTier(record.tier),
          url: record.url,
          published: record.published ?? '',
        })
      }
    }
  }

  return rows.sort((a, b) => String(b.published).localeCompare(String(a.published)))
}

/** The two buckets the page is built from, plus the counts for the summary. */
export function claimsByStatus() {
  const rows = allClaims()
  const confirmed = rows.filter((row) => row.status === 'OFFICIAL_CONFIRMED')
  const reported = rows.filter((row) => row.status !== 'OFFICIAL_CONFIRMED')
  const outlets = new Set(rows.map((row) => row.outlet))
  const updated = rows[0]?.published ?? ''
  return { rows, confirmed, reported, outlets: outlets.size, updated }
}

/**
 * The entries Rockstar or Take-Two established themselves. These come from the
 * hand-checked CSVs rather than from the robot, because an official source
 * writes a character bio, not a quotable news sentence, and the robot has
 * nothing to pull out of it. Each one is already a page, so the row links to it.
 */
export function confirmedEntities() {
  return pageEntities
    .filter((entity) => entity.sourceTier === 'TIER_1_OFFICIAL')
    .map((entity) => ({
      name: entity.name,
      href: urlFor(entity),
      entityType: entity.entityType,
      summary: entity.shortDescription,
    }))
    .sort((a, b) => a.entityType.localeCompare(b.entityType) || a.name.localeCompare(b.name))
}

/** The entries only the community has placed, which are the weakest evidence. */
export function communityEntities() {
  return pageEntities
    .filter((entity) => entity.sourceTier === 'TIER_3_COMMUNITY')
    .map((entity) => ({
      name: entity.name,
      href: urlFor(entity),
      entityType: entity.entityType,
      summary: entity.shortDescription,
    }))
    .sort((a, b) => a.entityType.localeCompare(b.entityType) || a.name.localeCompare(b.name))
}
