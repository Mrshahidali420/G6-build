/* Land shapes for the map page.

   The map page plots 731 measured positions and nothing else, because nothing
   else has been published. Shahid's reading of it on a phone was the right one:
   it looks like a page that failed to load. A scatter of dots on an empty field
   gives a reader no way to tell a city from a stray measurement, and no way to
   tell either of them from a bug.

   So this draws ground under the dots. Not a map of Leonida, which nobody
   outside Rockstar has: a shape worked out from the dots themselves. Where the
   measured points crowd together there is a landmass, where they thin out the
   shape tapers off, and where there is nothing there is water. Every edge here
   comes from the same coordinates the dots come from. Nothing is traced from a
   picture, because there is no picture to trace.

   The shapes are computed at build time and shipped as plain SVG paths. That
   matters: the obvious way to do this is an SVG blur filter over the circles,
   which the browser then has to re-run on every frame of a pan or a pinch. On
   the phone that screenshot was taken on, that is a slideshow. A path costs
   nothing to move. */

// How far one measured point spreads its claim to the ground around it. 620
// metres is about a ten minute walk, and it is the figure at which the Vice
// City points join into one landmass instead of a string of islands.
const REACH = 620

// The grid the shape is traced on. 90 metres is fine enough that a coastline
// reads as a coastline rather than as stairs, and coarse enough that the whole
// job stays well under a second at build time.
const CELL = 90

// Ground exists where the claims of nearby points add up past this. Raise it
// and the land pulls back to the dots; lower it and separate districts bleed
// into one blob.
const LEVEL = 0.34

/* One point's claim on a piece of ground, falling from 1 at the point itself to
   0 at REACH away. The curve is squared rather than straight so that the edge
   leaves smoothly instead of arriving at a crease. */
function claim(distanceSquared) {
  if (distanceSquared >= REACH * REACH) return 0
  const t = 1 - Math.sqrt(distanceSquared) / REACH
  return t * t
}

/* Marching squares. The field is sampled on a grid, and for every little square
   of four samples this works out where the shoreline crosses that square's
   edges. The case number is the four corners read as four bits, so each of the
   sixteen possible squares has a known answer. */
const CASES = [
  [], [[3, 2]], [[2, 1]], [[3, 1]],
  [[1, 0]], [[3, 2], [1, 0]], [[2, 0]], [[3, 0]],
  [[0, 3]], [[0, 2]], [[0, 3], [2, 1]], [[0, 1]],
  [[1, 3]], [[1, 2]], [[2, 3]], [],
]

/* Where along an edge the shoreline sits, read off the two corner values. This
   is what stops the coast looking like graph paper: without it every edge
   crossing would land at the middle of the cell wall. */
function cross(ax, ay, av, bx, by, bv) {
  const t = (LEVEL - av) / (bv - av)
  return [ax + (bx - ax) * t, ay + (by - ay) * t]
}

/* Chaikin's corner cutting, run twice. Each pass replaces every corner with two
   points a quarter of the way along each of its edges, which rounds the whole
   ring off without pulling it away from where the data put it. */
function smooth(ring, passes = 2) {
  let out = ring
  for (let pass = 0; pass < passes; pass += 1) {
    if (out.length < 4) return out
    const next = []
    for (let i = 0; i < out.length; i += 1) {
      const [ax, ay] = out[i]
      const [bx, by] = out[(i + 1) % out.length]
      next.push([ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25])
      next.push([ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75])
    }
    out = next
  }
  return out
}

/* Ramer-Douglas-Peucker. Corner cutting quadruples the number of points in a
   ring, and most of them sit on a straight run of coast where they say nothing.
   This drops any point that is within TRIM metres of the line between its
   neighbours, which takes the shipped path data down by about three quarters
   and changes nothing a reader can see. */
const TRIM = 26

function simplify(ring) {
  if (ring.length < 4) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1

  const stack = [[0, ring.length - 1]]
  while (stack.length > 0) {
    const [from, to] = stack.pop()
    if (to - from < 2) continue
    const [ax, ay] = ring[from]
    const [bx, by] = ring[to]
    const dx = bx - ax
    const dy = by - ay
    const span = Math.hypot(dx, dy) || 1
    let worst = -1
    let at = from
    for (let i = from + 1; i < to; i += 1) {
      const [px, py] = ring[i]
      const off = Math.abs(dy * px - dx * py + bx * ay - by * ax) / span
      if (off > worst) {
        worst = off
        at = i
      }
    }
    if (worst > TRIM) {
      keep[at] = 1
      stack.push([from, at], [at, to])
    }
  }
  return ring.filter((_, i) => keep[i] === 1)
}

/* Build the ground for one set of points.

   Returns an SVG path in the same coordinate system the dots are drawn in,
   which means y already flipped, because the game counts north upward and SVG
   counts it downward. */
export function landPath(points) {
  if (points.length === 0) return ''

  const minX = Math.min(...points.map((p) => p.x)) - REACH - CELL
  const maxX = Math.max(...points.map((p) => p.x)) + REACH + CELL
  const minY = Math.min(...points.map((p) => p.y)) - REACH - CELL
  const maxY = Math.max(...points.map((p) => p.y)) + REACH + CELL

  const cols = Math.ceil((maxX - minX) / CELL) + 1
  const rows = Math.ceil((maxY - minY) / CELL) + 1

  // Points are filed into buckets one REACH across, so sampling a piece of
  // ground only ever looks at the nine buckets around it instead of all 731
  // points. Without this the grid sweep is a few million distance checks.
  const buckets = new Map()
  const key = (bx, by) => `${bx},${by}`
  for (const point of points) {
    const bx = Math.floor(point.x / REACH)
    const by = Math.floor(point.y / REACH)
    const k = key(bx, by)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k).push(point)
  }

  const field = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row += 1) {
    const y = minY + row * CELL
    const by = Math.floor(y / REACH)
    for (let col = 0; col < cols; col += 1) {
      const x = minX + col * CELL
      const bx = Math.floor(x / REACH)
      let total = 0
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const near = buckets.get(key(bx + ox, by + oy))
          if (!near) continue
          for (const point of near) {
            const dx = point.x - x
            const dy = point.y - y
            total += claim(dx * dx + dy * dy)
          }
        }
      }
      field[row * cols + col] = total
    }
  }

  const at = (col, row) => field[row * cols + col]
  const worldX = (col) => minX + col * CELL
  const worldY = (row) => minY + row * CELL

  // Every shoreline crossing, as a loose pile of short segments.
  const segments = []
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const v = [at(col, row + 1), at(col + 1, row + 1), at(col + 1, row), at(col, row)]
      const code = (v[0] >= LEVEL ? 8 : 0) + (v[1] >= LEVEL ? 4 : 0) + (v[2] >= LEVEL ? 2 : 0) + (v[3] >= LEVEL ? 1 : 0)
      if (code === 0 || code === 15) continue

      const x0 = worldX(col)
      const x1 = worldX(col + 1)
      const y0 = worldY(row)
      const y1 = worldY(row + 1)
      // Edge 0 is the top of the square, then clockwise.
      const edges = [
        () => cross(x0, y1, v[0], x1, y1, v[1]),
        () => cross(x1, y1, v[1], x1, y0, v[2]),
        () => cross(x1, y0, v[2], x0, y0, v[3]),
        () => cross(x0, y0, v[3], x0, y1, v[0]),
      ]
      for (const [from, to] of CASES[code]) segments.push([edges[from](), edges[to]()])
    }
  }
  if (segments.length === 0) return ''

  // Sew the segments into closed rings. Two segments belong to the same ring
  // when one ends where the next begins, and they do so exactly, because both
  // ends were worked out from the same two corner values.
  const round = ([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`
  const starts = new Map()
  for (const segment of segments) {
    const k = round(segment[0])
    if (!starts.has(k)) starts.set(k, [])
    starts.get(k).push(segment)
  }

  const used = new Set()
  const rings = []
  for (const segment of segments) {
    if (used.has(segment)) continue
    const ring = [segment[0]]
    let current = segment
    while (current && !used.has(current)) {
      used.add(current)
      ring.push(current[1])
      const next = (starts.get(round(current[1])) || []).find((candidate) => !used.has(candidate))
      current = next
    }
    // A stray open chain is a grid artefact at the very edge of the field, and
    // a ring of three points is a single lonely sample. Neither is coastline.
    if (ring.length > 8) rings.push(ring)
  }
  if (rings.length === 0) return ''

  return rings
    .map((ring) => simplify(smooth(ring)))
    .map((ring) => {
      const head = ring[0]
      const body = ring.slice(1).map(([x, y]) => `${x.toFixed(0)} ${(-y).toFixed(0)}`)
      return `M${head[0].toFixed(0)} ${(-head[1]).toFixed(0)}L${body.join('L')}Z`
    })
    .join('')
}

/* Where to print an area's name: the middle of its points, not the middle of
   its shape. A long thin area like the Keys has a shape whose middle is in the
   sea, and its points are where the label belongs. */
export function labelAt(points) {
  const x = points.reduce((sum, p) => sum + p.x, 0) / points.length
  const y = points.reduce((sum, p) => sum + p.y, 0) / points.length
  return { x: Math.round(x), y: Math.round(-y) }
}
