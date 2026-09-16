// What the press has reported about an entry since the entry was written.
//
// data/robot/facts/<slug>.json is appended to by scripts/robot/entities.mjs and
// is checked in, so a build never needs the network. Every item carries the
// outlet's own words, because the robot is allowed to record that an outlet
// said something and is not allowed to say that the thing is true.
//
// An entry with no file simply has no section, which is the normal case.

import fs from 'node:fs'
import path from 'node:path'

const dir = path.join(process.cwd(), 'data', 'robot', 'facts')

let files = []
try {
  files = fs.readdirSync(dir)
} catch {
  files = []
}

const load = (slug) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, `${slug}.json`), 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const known = new Set(files.filter((file) => file.endsWith('.json')).map((file) => file.slice(0, -5).toLowerCase()))

// Newest first. An item with no published date sorts last rather than being
// dropped: the quote is still checkable, only its date is missing.
export const factsFor = (slug) => {
  const key = String(slug).toLowerCase()
  if (!known.has(key)) return []
  return load(key)
    .filter((item) => item && item.fact && item.quote && item.url)
    .sort((a, b) => String(b.published ?? '').localeCompare(String(a.published ?? '')))
}

export const statusForTier = (tier) =>
  tier === 'TIER_1_OFFICIAL' ? 'OFFICIAL_CONFIRMED' : 'PRESS_REPORTED'
