// The cached Apple lookups, read at build time.
//
// data/music.json is written by scripts/build-music.mjs and is checked in, so
// a build never needs the network. A song with no entry here simply has no
// player and keeps its terrazzo plate, which is the right outcome: not every
// record is on Apple Music.

import fs from 'node:fs'
import path from 'node:path'

let music = {}
try {
  music = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'music.json'), 'utf8'))
} catch {
  music = {}
}

export const trackFor = (slug) => music[String(slug).toLowerCase()] ?? null
