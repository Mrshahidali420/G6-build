/**
 * Builds the camera shot file: where each piece of official GTA 6 footage was
 * filmed from.
 *
 * gtamaplib solves two different things out of the same footage. The landmarks
 * file says where an object in the world is, and that already feeds /map. The
 * cameras file says where the camera itself stood for one shot, which way it
 * pointed and how wide its lens was. That second half has never been used
 * here, and it answers a question people actually ask: where in Leonida was
 * this trailer shot filmed.
 *
 * The camera file covers two kinds of footage. Rockstar's own trailers and
 * screenshots, and the 2022 material taken from Rockstar without permission.
 * This site reports on the second kind in words and never republishes any of
 * it, so every camera whose source looks unofficial is dropped here. The same
 * test is used by scripts/import/gtamaplib.mjs, on purpose.
 *
 * Two more cameras are dropped because gtamaplib marks them X_excluded, which
 * is its own word for a placeholder that was never solved.
 *
 * Direction. gtamaplib stores yaw counting anticlockwise from north. That is
 * not written down anywhere in the file, so it was measured: for every camera
 * with at least five landmarks solved from it inside a tight cone, the compass
 * bearing from the camera to those landmarks was compared with the yaw. The
 * fit is bearing = (360 - yaw), and across 65 such cameras it is out by 6.8
 * degrees on average. That is the number used below.
 *
 * No coordinate is adjusted. The numbers written here are gtamaplib's numbers.
 *
 *   node scripts/import/cameras.mjs [path-to-gtamaplib]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = process.argv[2] || join(ROOT, '..', 'gta6-src', 'gtamaplib')
const DATA = join(SRC, 'gtamapdata')

/** Any source that looks like the 2022 material, or a 2026 build dump. */
const UNOFFICIAL = /^20(21|22)-|leak|cyberleak|build 20/i

const cameraFile = join(DATA, 'cameras.json')
if (!existsSync(cameraFile)) {
  console.error(`[cameras] missing ${cameraFile}`)
  process.exit(1)
}

/**
 * The piece of footage a reader knows, and the shot inside it.
 *
 * The source strings carry the surveyor's own working notes, some of them in
 * French, inside brackets and long parentheses. Those notes are his, they are
 * not facts about the game, and they are stripped here.
 */
const FOOTAGE_ORDER = ['Trailer 1', 'Trailer 2', 'Extended Look', 'Screenshot set 1', 'Screenshot set 2', 'Screenshot set 3', 'Other Rockstar footage']

function readSource(raw) {
  const text = String(raw || '').trim()

  let footage = 'Other Rockstar footage'
  if (/extended look/i.test(text)) footage = 'Extended Look'
  else if (/^Trailer (\d)/i.test(text)) footage = `Trailer ${text.match(/^Trailer (\d)/i)[1]}`
  else if (/^Screenshot (\d)/i.test(text)) footage = `Screenshot set ${text.match(/^Screenshot (\d)/i)[1]}`

  // The frame number, where the surveyor recorded one.
  const frame = (text.match(/\[(\d+)\]/) || [])[1] || null

  let label = text
    .replace(/\[[^\]]*\]/g, ' ')                          // working brackets
    .replace(/^Trailer \d\s*(\(Extended Look\))?\s*[—-]?\s*/i, '')
    .replace(/^Screenshot \d\s*[—-]\s*/i, '')
    .split('—')[0]                                        // the note after the dash
    .replace(/\([^)]*(\d{4}-\d{2}-\d{2}|webp)[^)]*\)/gi, ' ') // file and date notes
    .replace(/\([^)]{25,}\)/g, ' ')                       // long parenthetical notes
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,;—-]$/, '')
    .trim()

  // What is left has to read like the name of a shot. Anything carrying a
  // timestamp, a frame note or a whole sentence is the surveyor's working
  // note, not a name, and the camera's own name is used instead.
  if (label.length > 46 || /\d{4}-\d{2}-\d{2}|~\d|frame|miroir|showcase/i.test(label)) label = ''

  return { footage, frame: frame ? Number(frame) : null, label }
}

/** Compass bearing in degrees, 0 north, rising clockwise. See the header. */
const bearingOf = (yaw) => Math.round(((360 - (((yaw % 360) + 360) % 360)) % 360) * 10) / 10

const COMPASS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']
const compassOf = (bearing) => COMPASS[Math.round(bearing / 45) % 8]

const slugify = (text) =>
  String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ------------------------------------------------------------------ cameras */

const cameras = JSON.parse(readFileSync(cameraFile, 'utf8'))

let inSource = 0
let unofficial = 0
let excluded = 0
let incomplete = 0
const shots = []
const seen = new Set()

for (const [name, camera] of Object.entries(cameras)) {
  if (name.startsWith('_') || !camera) continue
  inSource += 1

  const source = String(camera.source || '')
  if (!source || UNOFFICIAL.test(source)) {
    unofficial += 1
    continue
  }
  if (camera.constraint_class === 'X_excluded') {
    excluded += 1
    continue
  }
  const xyz = camera.xyz
  const ypr = camera.ypr
  if (!Array.isArray(xyz) || xyz.length !== 3 || xyz.some((n) => typeof n !== 'number') || !Array.isArray(ypr) || typeof ypr[0] !== 'number') {
    incomplete += 1
    continue
  }

  const { footage, frame, label } = readSource(source)
  const bearing = bearingOf(ypr[0])

  // The lens. gtamaplib stores two numbers, the horizontal and the vertical
  // field of view, and fills in whichever one it could solve.
  const fov = Array.isArray(camera.fov) ? camera.fov.find((n) => typeof n === 'number') : null

  let slug = slugify(name)
  if (!slug) slug = slugify(`${footage} ${shots.length + 1}`)
  while (seen.has(slug)) slug = `${slug}-2`
  seen.add(slug)

  shots.push({
    slug,
    name,
    footage,
    shot: label || name,
    frame,
    x: Number(xyz[0].toFixed(1)),
    y: Number(xyz[1].toFixed(1)),
    z: Number(xyz[2].toFixed(1)),
    bearing,
    compass: compassOf(bearing),
    pitch: typeof ypr[1] === 'number' ? Number(ypr[1].toFixed(1)) : null,
    fov: typeof fov === 'number' ? Number(fov.toFixed(1)) : null,
    width: Array.isArray(camera.size) ? camera.size[0] : null,
    height: Array.isArray(camera.size) ? camera.size[1] : null,
    // gtamaplib's own word for a camera it could not tie to solved ground.
    approximate: camera.constraint_class === 'D_no_ground_truth',
  })
}

/* -------------------------------------------------------------- the nearest */

// Every shot gets the named places closest to where the camera stood, taken
// from the same survey that feeds /map. It turns a row of numbers into a
// sentence a reader can picture.
const mapFile = join(ROOT, 'src', 'data', 'map-points.json')
const named = existsSync(mapFile)
  ? JSON.parse(readFileSync(mapFile, 'utf8')).points.filter((point) => point.named)
  : []

for (const shot of shots) {
  shot.near = named
    .map((point) => ({ name: point.name, zone: point.zone, zoneLabel: point.zoneLabel, m: Math.round(Math.hypot(point.x - shot.x, point.y - shot.y)) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 3)
  const closest = shot.near[0]
  // The area is the area of the nearest surveyed place, and only when that
  // place is close enough for the answer to mean anything.
  shot.zone = closest && closest.m <= 1200 ? closest.zone : 'unknown'
  shot.zoneLabel = closest && closest.m <= 1200 ? closest.zoneLabel : 'Not placed in a named area'
}

shots.sort(
  (a, b) =>
    FOOTAGE_ORDER.indexOf(a.footage) - FOOTAGE_ORDER.indexOf(b.footage) ||
    (a.frame || 0) - (b.frame || 0) ||
    a.name.localeCompare(b.name),
)

const tally = {}
for (const shot of shots) tally[shot.footage] = (tally[shot.footage] || 0) + 1

const heights = shots.map((shot) => shot.z).sort((a, b) => a - b)
const lenses = shots.map((shot) => shot.fov).filter((n) => typeof n === 'number').sort((a, b) => a - b)

const facing = {}
for (const shot of shots) facing[shot.compass] = (facing[shot.compass] || 0) + 1

const bounds = shots.reduce(
  (box, shot) => ({
    minX: Math.min(box.minX, shot.x),
    maxX: Math.max(box.maxX, shot.x),
    minY: Math.min(box.minY, shot.y),
    maxY: Math.max(box.maxY, shot.y),
  }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
)

const out = {
  source: 'gtamaplib (NeutralState), gtamapdata/cameras.json',
  sourceUrl: 'https://github.com/NeutralState/gtamaplib',
  method:
    'Camera positions solved from official Rockstar trailers and screenshots by matching objects that appear in several frames. Cameras solved from unofficial material are not included. Compass bearings are derived from the stored yaw, which counts anticlockwise from north.',
  bearingFit: { model: 'bearing = 360 - yaw', camerasChecked: 65, meanErrorDegrees: 6.8 },
  generated: new Date().toISOString().slice(0, 10),
  counts: {
    camerasInSource: inSource,
    droppedNotOfficial: unofficial,
    droppedPlaceholder: excluded,
    droppedIncomplete: incomplete,
    kept: shots.length,
    approximate: shots.filter((shot) => shot.approximate).length,
  },
  footage: Object.fromEntries(FOOTAGE_ORDER.filter((key) => tally[key]).map((key) => [key, tally[key]])),
  facing: Object.fromEntries(Object.entries(facing).sort((a, b) => b[1] - a[1])),
  heightM: { lowest: heights[0], median: heights[Math.floor(heights.length / 2)], highest: heights[heights.length - 1] },
  lensFov: lenses.length ? { narrowest: lenses[0], median: lenses[Math.floor(lenses.length / 2)], widest: lenses[lenses.length - 1] } : null,
  bounds,
  shots,
}

writeFileSync(join(ROOT, 'src', 'data', 'camera-shots.json'), JSON.stringify(out) + '\n')

console.log(`[cameras] ${inSource} cameras in source`)
console.log(`[cameras] ${unofficial} dropped, not official Rockstar footage`)
console.log(`[cameras] ${excluded} dropped, placeholder; ${incomplete} dropped, incomplete`)
console.log(`[cameras] kept ${shots.length}, of which ${out.counts.approximate} are marked approximate`)
console.log(`[cameras] ${Object.entries(out.footage).map(([k, v]) => `${k} ${v}`).join(', ')}`)
console.log('[cameras] wrote src/data/camera-shots.json')
