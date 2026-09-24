// The real Florida places behind GTA 6, grouped two ways from one list.
//
// src/data/real-places.json (written by scripts/import/real-places.mjs) holds
// one flat list of rows from the GTADB community map. /real-places groups it
// by in-game area and the city pages group it by real city. Both groupings
// are made here from the same rows, so a count on one page always matches
// the same count on another.
import feed from '../data/real-places.json'
import { bySlug, pageEntities, urlFor } from './entities.mjs'

export { feed }

/** A real city gets its own page at this many named matches or more. */
export const MIN_SURE = 12

const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function tally(rows, key) {
  const counts = new Map()
  for (const row of rows) {
    if (!row[key]) continue
    counts.set(row[key], (counts.get(row[key]) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function groupBy(rows, key) {
  const groups = new Map()
  for (const row of rows) {
    if (!row[key]) continue
    if (!groups.has(row[key])) groups.set(row[key], [])
    groups.get(row[key]).push(row)
  }
  return groups
}

/** Every real town in the set, busiest first. */
export const towns = tally(feed.rows, 'city')

/** In-game areas, biggest first, with the real towns each one draws on. */
export const areas = [...groupBy(feed.rows, 'area').entries()]
  .map(([name, items]) => ({ name, count: items.length, cities: tally(items, 'city'), items }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

/** Real cities with a page of their own, busiest first. */
export const cities = [...groupBy(feed.rows, 'city').entries()]
  .filter(([, rows]) => rows.length >= MIN_SURE)
  .map(([name, rows]) => ({
    slug: slugify(name),
    name,
    sure: rows.length,
    unnamed: feed.unnamedByCity[name] || 0,
    unconfirmed: rows.filter((row) => row.unconfirmed).length,
    linked: rows.filter((row) => row.entity && bySlug.has(row.entity)).length,
    regions: tally(rows, 'region'),
    districts: tally(rows, 'district'),
    rows,
  }))
  .sort((a, b) => b.sure - a.sure || a.name.localeCompare(b.name))

export const cityPath = (city) => `/real-places/${city.slug}`

const cityByName = new Map(cities.map((city) => [city.name, city]))
const rowById = new Map(feed.rows.map((row) => [row.id, row]))

/** The searched-for places, with their rows and the city page that holds them. */
export const asked = feed.asked.map((item) => {
  const rows = item.ids.map((id) => rowById.get(id)).filter(Boolean)
  const page = item.city
    ? cityByName.get(item.city)
    : rows.map((row) => cityByName.get(row.city)).find(Boolean)
  return { ...item, rows, page: page || null }
})

/** One landmark opened on the GTADB community map. */
export const gtadbUrl = (id) => `https://map.gtadb.org/#VI,${id}`

/** The real spot on OpenStreetMap, or null when gtadb has no coordinates. */
export const osmUrl = (row) =>
  row.lat == null || row.lng == null
    ? null
    : `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=18/${row.lat}/${row.lng}`

/** Our page for a landmark the reviewed address match tied to it. */
export const entityUrl = (slug) => {
  const entity = slug ? bySlug.get(slug) : null
  return entity ? urlFor(entity) : null
}

/** Rows whose in-game name has its own page on this site. */
export const linkedCount = feed.rows.filter((row) => entityUrl(row.entity)).length

const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** In-game place names (areas and districts) to their location page, exact names only. */
const locationByName = new Map()
for (const entity of pageEntities) {
  if (entity.entityType !== 'location') continue
  for (const name of [entity.name, ...(entity.altNames || [])]) {
    const key = norm(name)
    if (key && !locationByName.has(key)) locationByName.set(key, urlFor(entity))
  }
}
export const locationUrl = (name) => locationByName.get(norm(name)) || null

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/** "Stockyard, Vice City" style label for where a row sits in the game. */
export const gameWhere = (row) => [row.district, row.region].filter(Boolean).join(', ')
