// Derive the modern formats for every entity picture.
//
// The .jpg in public/img/entities stays the source of truth and the fallback.
// This writes AVIF and WebP copies at two widths into public/img/entities/r/,
// which is a subfolder so src/lib/images.mjs never mistakes a derived file for
// an entity of its own. Runs before astro build and skips work that is already
// done, so a rebuild with no new pictures costs nothing.

import { readdirSync, existsSync, statSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(ROOT, 'public', 'img', 'entities')
const OUT_DIR = join(SRC_DIR, 'r')

// One width for an ordinary screen, one for a dense screen.
export const WIDTHS = [640, 1280]

const FORMATS = [
  { ext: 'avif', run: (pipe) => pipe.avif({ quality: 50, effort: 6 }) },
  { ext: 'webp', run: (pipe) => pipe.webp({ quality: 74 }) },
]

if (!existsSync(SRC_DIR)) {
  console.log('[build-images] no public/img/entities, nothing to do')
  process.exit(0)
}

mkdirSync(OUT_DIR, { recursive: true })

const sources = readdirSync(SRC_DIR).filter((name) => /\.jpe?g$/i.test(name))

let written = 0
let skipped = 0
let bytes = 0

for (const name of sources) {
  const slug = name.replace(/\.jpe?g$/i, '')
  const srcPath = join(SRC_DIR, name)
  const srcTime = statSync(srcPath).mtimeMs
  let input = null

  for (const width of WIDTHS) {
    for (const format of FORMATS) {
      const outPath = join(OUT_DIR, `${slug}-${width}.${format.ext}`)

      if (existsSync(outPath) && statSync(outPath).mtimeMs >= srcTime) {
        skipped += 1
        bytes += statSync(outPath).size
        continue
      }

      input ??= await readFile(srcPath)
      const buf = await format.run(
        sharp(input).resize({ width, withoutEnlargement: true }),
      ).toBuffer()

      await writeFile(outPath, buf)
      written += 1
      bytes += buf.length
    }
  }
}

console.log(
  `[build-images] ${sources.length} source(s), ${written} written, ${skipped} already current, ` +
  `${(bytes / 1048576).toFixed(1)} MB derived`,
)
