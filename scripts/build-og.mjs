// Draw the social share card once, by hand, into public/og.png.
//
// Every link to this site that gets pasted into a chat, a forum or a social
// post shows this picture. Without it the platforms pick something at random or
// show nothing at all, which reads as an abandoned site. It is generated rather
// than designed in a tool so the card always matches the tokens in world.css.
//
// Run it by hand with `node scripts/build-og.mjs`. It is not part of the build,
// because the output is committed and only changes when the brand changes.

import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Tokens, copied from src/styles/world.css. Kept literal because an SVG cannot
// read a CSS custom property.
const GLAZE = '#0f5d53'
const GLAZE_DEEP = '#0a453e'
const BRASS = '#b08637'
const ON_GLAZE = '#eef5f2'
const ON_GLAZE_2 = '#b9d6cd'
const CLAY = '#a8492f'

// The card is the standard 1200x630 that every platform crops from.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${GLAZE}"/>
  <rect x="0" y="0" width="1200" height="14" fill="${BRASS}"/>
  <rect x="0" y="616" width="1200" height="14" fill="${GLAZE_DEEP}"/>

  <circle cx="1060" cy="120" r="9" fill="${BRASS}" opacity="0.75"/>
  <circle cx="1110" cy="180" r="6" fill="${ON_GLAZE}" opacity="0.35"/>
  <circle cx="1040" cy="210" r="5" fill="${CLAY}" opacity="0.8"/>
  <circle cx="1128" cy="96" r="4" fill="${ON_GLAZE}" opacity="0.25"/>

  <g transform="translate(96 150) scale(3.6)">
    <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="3.5" fill="${BRASS}"/>
    <rect x="3.25" y="3.25" width="33.5" height="33.5" rx="1.75" fill="${GLAZE_DEEP}"/>
    <circle cx="9.5" cy="33" r="1.5" fill="${BRASS}" opacity="0.75"/>
    <circle cx="31.5" cy="8" r="1.1" fill="${ON_GLAZE}" opacity="0.4"/>
    <circle cx="30" cy="33.5" r="0.9" fill="${CLAY}" opacity="0.8"/>
    <path d="M8 10.5h5.4l4.1 13.2 4.1-13.2H27L20.3 31h-5.6z" fill="${ON_GLAZE}"/>
    <rect x="28.4" y="10.5" width="4.3" height="20.5" fill="${ON_GLAZE}"/>
  </g>

  <text x="96" y="380" font-family="Archivo, Segoe UI, Arial, sans-serif" font-size="92" font-weight="800" letter-spacing="-1" fill="${ON_GLAZE}">GTA 6 Record</text>
  <text x="96" y="446" font-family="Archivo, Segoe UI, Arial, sans-serif" font-size="38" font-weight="500" fill="${ON_GLAZE_2}">Sourced, not guessed</text>
  <rect x="96" y="486" width="150" height="4" fill="${BRASS}"/>
  <text x="96" y="552" font-family="Archivo, Segoe UI, Arial, sans-serif" font-size="30" font-weight="500" fill="${ON_GLAZE_2}">Every fact names where it came from. gta6record.com</text>
</svg>`

const out = join(ROOT, 'public', 'og.png')
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out)
console.log('[build-og] wrote public/og.png')
