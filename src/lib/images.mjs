// Real pictures, when there are any.
//
// Drop a file at public/img/entities/<slug>.jpg (or .png, .webp, .avif) and the
// entity tile and the entity page use it instead of the terrazzo plate. Nothing
// else has to change. An optional public/img/entities/credits.json maps a slug
// to the line printed under the picture, so no image ever ships uncredited.

import fs from 'node:fs'
import path from 'node:path'

const dir = path.join(process.cwd(), 'public', 'img', 'entities')

let files = []
try {
  files = fs.readdirSync(dir)
} catch {
  files = []
}

const IMAGE = /\.(jpe?g|png|webp|avif)$/i

export const entityImages = new Map(
  files
    .filter((file) => IMAGE.test(file))
    .map((file) => [file.replace(IMAGE, '').toLowerCase(), `/img/entities/${file}`]),
)

let credits = {}
try {
  credits = JSON.parse(fs.readFileSync(path.join(dir, 'credits.json'), 'utf8'))
} catch {
  credits = {}
}

export const imageFor = (slug) => entityImages.get(String(slug).toLowerCase()) ?? null

// A credit entry is either a plain line or an object with the line plus its
// source URL and file name. Either way the page prints one string.
export const creditFor = (slug) => {
  const entry = credits[String(slug).toLowerCase()]
  if (!entry) return null
  return typeof entry === 'string' ? entry : (entry.credit ?? null)
}

export const creditSourceFor = (slug) => {
  const entry = credits[String(slug).toLowerCase()]
  return entry && typeof entry === 'object' ? (entry.source ?? null) : null
}

// Derived copies written by scripts/build-images.mjs into the r/ subfolder.
// They are smaller than the .jpg but not every browser reads them, so the .jpg
// stays the fallback and this only adds the extra <source> lines when the
// files are actually on disk.
const DERIVED_WIDTHS = [640, 1280]

let derived = []
try {
  derived = fs.readdirSync(path.join(dir, 'r'))
} catch {
  derived = []
}
const derivedSet = new Set(derived)

const setFor = (slug, ext) => {
  const parts = DERIVED_WIDTHS
    .filter((w) => derivedSet.has(`${slug}-${w}.${ext}`))
    .map((w) => `/img/entities/r/${slug}-${w}.${ext} ${w}w`)
  return parts.length ? parts.join(', ') : null
}

export const srcSetsFor = (slug) => {
  const key = String(slug).toLowerCase()
  const avif = setFor(key, 'avif')
  const webp = setFor(key, 'webp')
  return avif || webp ? { avif, webp } : null
}

// Extra pictures for one entry.
//
// The main picture is public/img/entities/<slug>.jpg. Extra ones are numbered
// from two: <slug>-2.jpg, <slug>-3.jpg and so on, with no gaps. Each numbered
// file gets its own credits.json entry keyed by the file name, so every extra
// picture carries the same credit and source line as the first one. Numbering
// stops at the first gap on purpose: a missing -3 means the set ends at -2, it
// does not mean look for a -4.
const MAX_GALLERY = 12

export const galleryFor = (slug) => {
  const key = String(slug).toLowerCase()
  const shots = []

  const push = (name) => {
    const src = entityImages.get(name)
    if (!src) return false
    shots.push({
      key: name,
      src,
      credit: creditFor(name),
      source: creditSourceFor(name),
      sets: srcSetsFor(name),
    })
    return true
  }

  push(key)
  for (let n = 2; n <= MAX_GALLERY; n += 1) {
    if (!push(`${key}-${n}`)) break
  }

  return shots
}
