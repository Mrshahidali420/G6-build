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

export const creditFor = (slug) => credits[String(slug).toLowerCase()] ?? null
