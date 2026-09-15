// Pull the two Google font files onto our own server, once.
//
// Third party font CSS blocks the first paint and costs two extra DNS lookups.
// This downloads the woff2 variable files into public/fonts/ and prints the
// @font-face rules to paste into the layout. Run it by hand, not in the build.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'fonts')
mkdirSync(OUT, { recursive: true })

// A modern browser user agent, so Google serves woff2 and not an older format.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&family=Source+Serif+4:opsz,wght@8..60,400..600&display=swap'

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text()

// Keep only the latin block. The site is English, so the other subsets are
// weight nobody downloads but everybody pays for in the CSS.
const blocks = css.split('@font-face').slice(1)
const rules = []

for (const block of blocks) {
  const family = block.match(/font-family:\s*'([^']+)'/)?.[1]
  const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1]
  const range = block.match(/unicode-range:\s*([^;]+);/)?.[1]
  if (!family || !url) continue
  // latin has U+0000 in its range; latin-ext and the rest do not.
  if (!range || !/U\+0000/.test(range)) continue

  const name = family.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.woff2'
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  writeFileSync(join(OUT, name), buf)

  const stretch = block.match(/font-stretch:\s*([^;]+);/)?.[1]
  const weight = block.match(/font-weight:\s*([^;]+);/)?.[1]
  rules.push(
    [
      '@font-face {',
      `  font-family: '${family}';`,
      '  font-style: normal;',
      weight ? `  font-weight: ${weight.trim()};` : null,
      stretch ? `  font-stretch: ${stretch.trim()};` : null,
      '  font-display: swap;',
      `  src: url('/fonts/${name}') format('woff2-variations');`,
      `  unicode-range: ${range.trim()};`,
      '}',
    ]
      .filter(Boolean)
      .join('\n'),
  )
  console.log(`[fetch-fonts] ${name} ${(buf.length / 1024).toFixed(0)} KB`)
}

writeFileSync(join(OUT, 'faces.css'), rules.join('\n\n') + '\n')
console.log(`[fetch-fonts] ${rules.length} face(s), rules in public/fonts/faces.css`)
