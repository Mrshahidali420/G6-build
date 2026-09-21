/**
 * Builds the official screenshot gallery.
 *
 * Rockstar put a set of screenshots on the Grand Theft Auto VI promotional
 * website. They are the only pictures of this game that Rockstar has actually
 * published. rallow15/gta6-wiki collected them under their original Rockstar
 * file names, and those names are the useful part: each one says which
 * character, place or pre-order pack the shot belongs to.
 *
 * This script reads that folder, works out the subject from the file name,
 * ties it to an entity on this site where one exists, shrinks every picture to
 * two web sizes in two modern formats, and writes src/data/gallery.json.
 *
 * Nothing here is leaked material. Every file is a Rockstar promotional
 * screenshot. The one file that is not named the Rockstar way is skipped,
 * because a file whose origin cannot be read off its own name cannot be
 * credited honestly.
 *
 * The originals are 4K and run to 145 MB together. They are not copied in.
 * Only the derived 640 and 1600 pixel WebP and AVIF copies ship.
 *
 *   node scripts/import/gallery.mjs [path-to-rallow15-gta6-wiki]
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = process.argv[2] || join(ROOT, '..', 'gta6-src', 'rallow15-gta6-wiki')
const IN_DIR = join(SRC, 'public', 'images', 'gta6-screens')
const OUT_DIR = join(ROOT, 'public', 'img', 'gallery')

const WIDTHS = [640, 1600]
const FORMATS = [
  { ext: 'avif', run: (pipe) => pipe.avif({ quality: 50, effort: 6 }) },
  { ext: 'webp', run: (pipe) => pipe.webp({ quality: 74 }) },
]

if (!existsSync(IN_DIR)) {
  console.error(`[gallery] missing ${IN_DIR}`)
  process.exit(1)
}

/**
 * Rockstar's own file names run words together, so the subject has to be split
 * back apart. A plain camel case split gets almost all of it. These are the
 * ones it gets wrong, plus the sets whose proper name has a word the file name
 * dropped.
 */
const NAMES = {
  Ambrosia: 'Ambrosia',
  BoobieIke: 'Boobie Ike',
  BrianHeder: 'Brian Heder',
  CalHampton: 'Cal Hampton',
  DreQuanPriest: 'DreQuan Priest',
  Grassrivers: 'Grassrivers',
  JasonDuval: 'Jason Duval',
  LeonidaKeys: 'Leonida Keys',
  LuciaCaminos: 'Lucia Caminos',
  MountKalaga: 'Mount Kalaga',
  PortGellhorn: 'Port Gellhorn',
  RaulBautista: 'Raul Bautista',
  RealDimez: 'Real Dimez',
  ViceCity: 'Vice City',
  UltimateEdition: 'Ultimate Edition',
  VintageViceCityPack: 'Vintage Vice City Pack',
  ElectricFang: 'Electric Fang',
  GoodtimeGear: 'Goodtime Gear',
  GrottiCheetah: 'Grotti Cheetah',
  HawkandLittleMorganRevolvers: 'Hawk and Little Morgan revolvers',
  OneEyedWillie: 'One Eyed Willie',
  PTTStore: 'PTT store',
  RideoutCustoms: 'Rideout Customs',
  SafehouseVehicles: 'Safehouse vehicles',
  SarasSalon: "Sara's Salon",
  Squalo: 'Squalo',
  Stock: 'Stock',
  VapidBuggy: 'Vapid buggy',
  VapidGanadoRetroBuild: 'Vapid Ganado retro build',
  ViceCityStyle: 'Vice City style',
  WeaponVariants: 'Weapon variants',
  WymanCarCollection: 'Wyman car collection',
  ExclusiveLooks: 'Exclusive looks',
  VapidStanier: 'Vapid Stanier',
  WeaponPattern: 'Weapon pattern',
}

/** The three sets the shots divide into, in the order a reader wants them. */
const SETS = [
  { key: 'people', label: 'People', blurb: 'The characters Rockstar has named and shown.' },
  { key: 'places', label: 'Places', blurb: 'The parts of Leonida Rockstar has shown by name.' },
  { key: 'editions', label: 'Edition and pre-order content', blurb: 'What the Ultimate Edition and the Vintage Vice City Pack contain.' },
]

const PLACES = new Set(['Ambrosia', 'Grassrivers', 'LeonidaKeys', 'MountKalaga', 'PortGellhorn', 'ViceCity'])

const slugify = (text) =>
  String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const pretty = (token) =>
  NAMES[token] || token.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()

/* -------------------------------------------------------------- the entities */

/** Every page on this site, by name, so a shot can link to what it shows. */
const HUB_OF = {
  character: 'characters', vehicle: 'vehicles', location: 'locations', song: 'soundtrack',
  business: 'businesses', brand: 'brands', landmark: 'landmarks', weapon: 'weapons',
  gameplay_feature: 'gameplay', edition: 'editions', wildlife: 'wildlife',
}
const entityFile = join(ROOT, 'src', 'data', 'entities.json')
const byName = new Map()
if (existsSync(entityFile)) {
  for (const entity of JSON.parse(await readFile(entityFile, 'utf8'))) {
    const hub = HUB_OF[entity.entityType]
    if (!hub) continue
    for (const name of [entity.name, ...(entity.altNames || [])]) {
      const key = slugify(name)
      if (key && !byName.has(key)) byName.set(key, { slug: entity.slug, name: entity.name, hub })
    }
  }
}

/* ---------------------------------------------------------------- the shots */

mkdirSync(OUT_DIR, { recursive: true })

const files = readdirSync(IN_DIR)
  .filter((name) => /^OfficialScreenshots-GTAVI-.+\.(jpe?g|png)$/i.test(name))
  .sort()

const skipped = readdirSync(IN_DIR).length - files.length

const shots = []
let made = 0
let reused = 0
let bytes = 0

for (const file of files) {
  // OfficialScreenshots-GTAVI-PromotionalWebsite-<Subject>[-<Detail>]-SS<n>.jpg
  const stem = file.replace(/\.(jpe?g|png)$/i, '').replace(/^OfficialScreenshots-GTAVI-/, '')
  const parts = stem.split('-')
  const origin = parts.shift() // PromotionalWebsite
  const last = parts[parts.length - 1]
  const frame = /^SS?\d+$/i.test(last) || /^\d+$/.test(last) ? parts.pop() : null
  const number = frame ? Number(String(frame).replace(/\D/g, '')) : null

  const subjectToken = parts[0] || 'Unknown'
  const detailToken = parts.slice(1).join('')
  const subject = pretty(subjectToken)
  const detail = detailToken ? pretty(detailToken) : null

  let set = 'people'
  if (PLACES.has(subjectToken)) set = 'places'
  else if (subjectToken === 'UltimateEdition' || subjectToken === 'VintageViceCityPack') set = 'editions'

  const title = detail ? `${subject}: ${detail}` : subject
  const slug = slugify(`${title} ${number || ''}`)

  // What this shot shows, on this site. The detail is the better match when
  // there is one, because "Ultimate Edition: Grotti Cheetah" is a car page.
  const link = (detail && byName.get(slugify(detail))) || byName.get(slugify(subject)) || null

  const source = join(IN_DIR, file)
  const derived = {}
  for (const width of WIDTHS) {
    for (const format of FORMATS) {
      const out = join(OUT_DIR, `${slug}-${width}.${format.ext}`)
      if (existsSync(out)) {
        reused += 1
      } else {
        const pipe = sharp(await readFile(source)).resize({ width, withoutEnlargement: true })
        await writeFile(out, await format.run(pipe).toBuffer())
        made += 1
      }
      bytes += statSync(out).size
      derived[`${format.ext}${width}`] = `/img/gallery/${slug}-${width}.${format.ext}`
    }
  }

  const meta = await sharp(await readFile(source)).metadata()

  shots.push({
    slug,
    title,
    subject,
    detail,
    set,
    number,
    file,
    width: meta.width || null,
    height: meta.height || null,
    src: derived.webp1600,
    srcset: `${derived.webp640} 640w, ${derived.webp1600} 1600w`,
    avifset: `${derived.avif640} 640w, ${derived.avif1600} 1600w`,
    alt: `Official Rockstar Games screenshot from Grand Theft Auto VI showing ${title}.`,
    credit: 'Rockstar Games, Grand Theft Auto VI promotional website',
    link: link ? { name: link.name, url: `/${link.hub}/${link.slug}` } : null,
  })
}

shots.sort(
  (a, b) =>
    SETS.findIndex((set) => set.key === a.set) - SETS.findIndex((set) => set.key === b.set) ||
    a.subject.localeCompare(b.subject) ||
    (a.detail || '').localeCompare(b.detail || '') ||
    (a.number || 0) - (b.number || 0),
)

/** The subjects, in the order the shots now sit in. */
const groups = []
for (const shot of shots) {
  const key = slugify(shot.subject)
  let group = groups.find((entry) => entry.key === key)
  if (!group) {
    group = { key, name: shot.subject, set: shot.set, count: 0, link: null }
    groups.push(group)
  }
  group.count += 1
  if (!group.link && shot.link && slugify(shot.subject) === slugify(shot.link.name)) group.link = shot.link
}

const out = {
  source: 'Rockstar Games promotional website for Grand Theft Auto VI',
  collectedBy: 'rallow15/gta6-wiki',
  collectedUrl: 'https://github.com/rallow15/gta6-wiki',
  note: 'Every picture here was published by Rockstar Games itself. Nothing on this site comes from material taken from Rockstar without permission.',
  generated: new Date().toISOString().slice(0, 10),
  counts: { shots: shots.length, subjects: groups.length, skipped, linked: shots.filter((shot) => shot.link).length },
  sets: SETS.map((set) => ({ ...set, count: shots.filter((shot) => shot.set === set.key).length })),
  groups,
  shots,
}

writeFileSync(join(ROOT, 'src', 'data', 'gallery.json'), JSON.stringify(out) + '\n')

console.log(`[gallery] ${files.length} official screenshots, ${skipped} file(s) skipped`)
console.log(`[gallery] ${made} derived files written, ${reused} already there`)
console.log(`[gallery] ${out.counts.linked} shots tied to a page on this site, ${groups.length} subjects`)
console.log(`[gallery] ${(bytes / 1024 / 1024).toFixed(1)} MB in public/img/gallery`)
console.log('[gallery] wrote src/data/gallery.json')
