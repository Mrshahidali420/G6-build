/**
 * Builds the map point file from the gtamaplib survey.
 *
 * gtamaplib solves world coordinates for things visible in Grand Theft Auto VI
 * footage. It does this by matching the same object across several frames and
 * working back to a position, the way a surveyor does. Each solved point
 * carries an error in metres and the list of frames it was solved from.
 *
 * Its camera set covers two kinds of footage: Rockstar's own trailers and
 * screenshots, and the 2022 material that was taken from Rockstar without
 * permission. This site reports on that second kind in words and never
 * republishes any of it, so this importer keeps ONLY the points whose every
 * source frame is official Rockstar footage. A point solved from even one
 * unofficial frame is dropped, and so is a point naming a frame that is not in
 * the camera file at all.
 *
 * No coordinate is adjusted. The numbers written here are the numbers
 * gtamaplib published.
 *
 *   node scripts/import/gtamaplib.mjs [path-to-gtamaplib]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = process.argv[2] || join(ROOT, '..', 'gta6-src', 'gtamaplib')
const DATA = join(SRC, 'gtamapdata')

/** Any frame whose source looks like the 2022 material, or a 2026 build dump. */
const UNOFFICIAL = /^20(21|22)-|leak|cyberleak|build 20/i

/** Survey control points. Real work, but not a place anyone searches for. */
const SURVEY =
  /^(Pin |CC |Tree on |Unnamed |Point |Marker |Node |Corner |Edge |Roof |Pole |Sign |Billboard|Large Billboard|Small Billboard|Tall Billboard)|\([A-Z0-9]{1,4}\)|^[A-Z]{1,3} \(|^KC\d+$/i

const ZONE_LABEL = {
  vice_city: 'Vice City',
  leonida_keys: 'Leonida Keys',
  port_gellhorn: 'Port Gellhorn',
  ambrosia: 'Ambrosia',
  grassrivers: 'Grassrivers',
  brickell: 'Brickell',
  leonard_county: 'Leonard County',
}

/** Turns a camera's source string into the piece of footage a reader knows. */
function footage(source) {
  const text = String(source || '')
  if (/extended look/i.test(text)) return 'Extended Look'
  const trailer = text.match(/^Trailer (\d)/i)
  if (trailer) return `Trailer ${trailer[1]}`
  const shot = text.match(/^Screenshot (\d)/i)
  if (shot) return `Screenshot set ${shot[1]}`
  return 'Rockstar footage'
}

const cameraFile = join(DATA, 'cameras.json')
const landmarkFile = join(DATA, 'landmarks.json')
for (const path of [cameraFile, landmarkFile]) {
  if (!existsSync(path)) {
    console.error(`[gtamaplib] missing ${path}`)
    process.exit(1)
  }
}

const cameras = JSON.parse(readFileSync(cameraFile, 'utf8'))
const source = {}
for (const [name, camera] of Object.entries(cameras)) {
  if (name.startsWith('_') || !camera) continue
  source[name] = String(camera.source || '')
}

const official = (camera) =>
  Object.prototype.hasOwnProperty.call(source, camera) &&
  source[camera] !== '' &&
  !UNOFFICIAL.test(source[camera])

const landmarks = JSON.parse(readFileSync(landmarkFile, 'utf8'))

let total = 0
let unsolved = 0
let dropped = 0
const points = []

for (const [name, value] of Object.entries(landmarks)) {
  total += 1
  const xyz = value && value.xyz
  if (!Array.isArray(xyz) || xyz.length !== 3 || xyz.some((n) => typeof n !== 'number')) {
    unsolved += 1
    continue
  }
  const cameras = Array.isArray(value.source_cameras) ? value.source_cameras : []
  if (cameras.length === 0 || !cameras.every(official)) {
    dropped += 1
    continue
  }

  const shots = [...new Set(cameras.map((camera) => footage(source[camera])))].sort()
  const zone = String(value.zone || '') || 'unknown'

  points.push({
    name,
    x: Number(xyz[0].toFixed(1)),
    y: Number(xyz[1].toFixed(1)),
    z: Number(xyz[2].toFixed(1)),
    zone,
    zoneLabel: ZONE_LABEL[zone] || 'Not placed in a named area',
    error: typeof value.error_m === 'number' ? Number(value.error_m.toFixed(1)) : null,
    shots,
    frames: cameras.length,
    named: !SURVEY.test(name),
  })
}

points.sort((a, b) => a.name.localeCompare(b.name))

const named = points.filter((point) => point.named)
const errors = points.map((point) => point.error).filter((value) => typeof value === 'number').sort((a, b) => a - b)
const shotTally = {}
for (const point of points) for (const shot of point.shots) shotTally[shot] = (shotTally[shot] || 0) + 1

const bounds = points.reduce(
  (box, point) => ({
    minX: Math.min(box.minX, point.x),
    maxX: Math.max(box.maxX, point.x),
    minY: Math.min(box.minY, point.y),
    maxY: Math.max(box.maxY, point.y),
  }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
)

const out = {
  source: 'gtamaplib (NeutralState), gtamapdata/landmarks.json',
  sourceUrl: 'https://github.com/NeutralState/gtamaplib',
  method:
    'Positions solved by matching the same object across several frames of official Rockstar footage. Points solved using any unofficial frame are not included.',
  generated: new Date().toISOString().slice(0, 10),
  counts: {
    landmarksInSource: total,
    unsolved,
    droppedNotOfficial: dropped,
    kept: points.length,
    named: named.length,
  },
  medianErrorM: errors.length ? errors[Math.floor(errors.length / 2)] : null,
  maxErrorM: errors.length ? errors[errors.length - 1] : null,
  footage: Object.fromEntries(Object.entries(shotTally).sort((a, b) => b[1] - a[1])),
  bounds,
  points,
}

writeFileSync(join(ROOT, 'src', 'data', 'map-points.json'), JSON.stringify(out) + '\n')

console.log(`[gtamaplib] ${total} landmarks in source`)
console.log(`[gtamaplib] ${unsolved} have no solved position`)
console.log(`[gtamaplib] ${dropped} dropped, not solved from official footage alone`)
console.log(`[gtamaplib] kept ${points.length}, of which ${named.length} carry a real place name`)
console.log(`[gtamaplib] median error ${out.medianErrorM} m, worst ${out.maxErrorM} m`)
console.log(`[gtamaplib] wrote src/data/map-points.json`)
