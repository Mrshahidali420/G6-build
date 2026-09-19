// Terrazzo plates.
//
// Most entries on this site have no picture we are allowed to publish, and a
// grey placeholder box is worse than nothing. So every entry gets a poured
// terrazzo plate instead: a glazed ground in its section's colour, a scatter of
// chips, and its initials cut into the surface. The scatter is derived from the
// slug, so a given entry always gets the same plate on every page and across
// every build. Drop a real photo into public/img/entities/<slug>.jpg and that
// photo takes over with no code change.

// Each section owns a glaze. The plate is how a visitor tells a car page from a
// song page at a glance, before reading a word.
const GLAZES = {
  character: { ground: '#0f5d53', chips: ['#b08637', '#eef5f2', '#0a453e'], ink: '#eef5f2' },
  vehicle: { ground: '#8a3b26', chips: ['#e5c98c', '#f3e6da', '#5c2417'], ink: '#f7eee7' },
  location: { ground: '#17495e', chips: ['#b08637', '#d9e8ee', '#0d3040'], ink: '#eaf3f7' },
  song: { ground: '#6d4b13', chips: ['#f0d79a', '#f6efe2', '#452e08'], ink: '#f9f2e4' },
  business: { ground: '#3d4a44', chips: ['#b08637', '#e9e7e0', '#242d29'], ink: '#f1f0ea' },
  brand: { ground: '#1b2320', chips: ['#b08637', '#c9dcd5', '#0f5d53'], ink: '#efece4' },
  landmark: { ground: '#2a5c4a', chips: ['#e5d3a4', '#f2efe6', '#143528'], ink: '#f0f6f1' },
  weapon: { ground: '#3a3f47', chips: ['#b08637', '#dfe3e8', '#1d2126'], ink: '#eef1f4' },
  gameplay_feature: { ground: '#4a4a24', chips: ['#c9c98a', '#f1efdf', '#2a2a10'], ink: '#f4f2e3' },
  edition: { ground: '#4a2b45', chips: ['#c79ec0', '#f0e6ee', '#2a1527'], ink: '#f5ecf3' },
  default: { ground: '#0f5d53', chips: ['#b08637', '#eef5f2', '#0a453e'], ink: '#eef5f2' },
}

export const glazeFor = (entityType) => GLAZES[entityType] ?? GLAZES.default

// Small deterministic hash. Same slug in, same number out, on every machine.
function hash(text) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

// Tiny seeded generator. Enough spread for a chip scatter, nothing more.
function generator(seed) {
  let state = seed || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

/**
 * Chips for one plate. Deterministic from the slug.
 * Returns plain numbers so the caller can emit them straight into SVG.
 */
export function chipsFor(slug, count = 13) {
  const random = generator(hash(slug))
  const chips = []
  for (let index = 0; index < count; index += 1) {
    chips.push({
      x: Math.round(random() * 400),
      y: Math.round(random() * 300),
      r: Math.round((3 + random() * 12) * 10) / 10,
      rotate: Math.round(random() * 360),
      squash: Math.round((0.45 + random() * 0.5) * 100) / 100,
      tone: Math.floor(random() * 3),
      fade: Math.round((0.35 + random() * 0.5) * 100) / 100,
    })
  }
  return chips
}

/** Up to two letters, the way a plaque would carry them. */
export function initialsFor(name) {
  const words = String(name)
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
