// Draw the PNG app icons from the same shape as public/favicon.svg.
//
// A phone that saves this site to its home screen, and every share sheet on
// iOS, asks for a PNG. An SVG favicon alone leaves those surfaces blank, which
// is the same abandoned-site signal an empty share card gives.
//
// Run it by hand with `node scripts/build-icons.mjs`. Like the social card, the
// output is committed and only changes when the brand changes.

import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// The favicon mark, redrawn at 180 so the strokes stay crisp instead of being
// upscaled from a 40 unit viewBox. The padding differs on purpose: a home
// screen icon is masked and rounded by the operating system, so the mark needs
// room the favicon does not.
const mark = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#0a453e"/>
  <rect x="${pad}" y="${pad}" width="${40 - pad * 2}" height="${40 - pad * 2}" fill="none" stroke="#b08637" stroke-width="1.5"/>
  <path d="M8 10.5h5.4l4.1 13.2 4.1-13.2H27L20.3 31h-5.6z" fill="#eef5f2"/>
  <rect x="28.4" y="10.5" width="4.3" height="20.5" fill="#eef5f2"/>
</svg>`

const icons = [
  { file: 'apple-touch-icon.png', size: 180, pad: 3 },
  { file: 'icon-192.png', size: 192, pad: 3 },
  { file: 'icon-512.png', size: 512, pad: 3 },
]

for (const icon of icons) {
  const png = await sharp(Buffer.from(mark(icon.size, icon.pad)))
    .resize(icon.size, icon.size)
    .png()
    .toBuffer()
  await writeFile(join(ROOT, 'public', icon.file), png)
  console.log(`wrote public/${icon.file} (${png.length} bytes)`)
}
