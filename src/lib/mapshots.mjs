/* Which official picture looks at a point on the map.

   Clicking a dot used to give numbers and nothing else, and numbers are a poor
   answer to "what is this place". There is no photograph of an individual
   landmark to show, and there never will be one until the game ships. What
   there is, is the other half of the gtamaplib survey: 113 solved camera
   positions. For each piece of official Rockstar footage it says where the
   camera stood, which way it pointed and how wide the lens was.

   That is enough to answer a narrower question honestly. Given a camera
   position, a bearing and a field of view, a landmark either falls inside that
   camera's frame or it does not. So a dot can be shown the official picture
   whose frame it sits in, with the distance printed next to it, and the reader
   can judge for themselves.

   Only pictures this site already hosts are used. Twenty-four of the solved
   cameras are Rockstar's own promotional screenshots, which are in
   src/data/gallery.json and in public/img/gallery already, credited. Nothing
   new is downloaded and no video frame is copied.

   What this does NOT claim: that the landmark is visible. Nothing here knows
   about a building standing in front of another building. The wording on the
   page says the camera pointed this way from this far, which is what the
   numbers actually support. */

// Past this the landmark is a smudge on the horizon and the picture stops
// being an answer to "what is this place". A kilometre and a half is roughly
// the far side of downtown Vice City from the near side.
const MAX_M = 1500

// Closer than this and the camera is practically standing on the landmark, so
// the bearing is noise.
const MIN_M = 20

/* The gallery slug for a solved camera, or null.

   gtamaplib names its screenshot cameras "<Subject> <NN> (<what is in it>)",
   and the gallery names the same picture "<subject>-<N>", because both numbers
   come from Rockstar's own SS numbering in the file name. A camera with no
   number in its name is trailer footage, which this site does not host. */
function gallerySlug(name) {
  const match = /^(.*?)\s+(\d+)\s*\(/.exec(name) || /^(.*?)\s+(\d+)$/.exec(name)
  if (!match) return null
  const subject = match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${subject}-${Number(match[2])}`
}

/* Build the lookup the map page ships.

   Returns the list of usable shots, and for every point the index of the shot
   that frames it from closest. The closest camera is the one whose picture is
   most likely to be worth looking at, and it is a rule a reader can check
   against the printed distance. */
export function shotViews(points, shots, gallery) {
  const pictures = new Map(gallery.shots.map((shot) => [shot.slug, shot]))

  const usable = []
  for (const shot of shots) {
    const slug = gallerySlug(shot.name)
    const picture = slug ? pictures.get(slug) : null
    if (!picture) continue
    usable.push({
      name: shot.name,
      footage: shot.footage,
      compass: shot.compass,
      approximate: shot.approximate === true,
      x: shot.x,
      y: shot.y,
      bearing: shot.bearing,
      half: shot.fov / 2,
      src: picture.src,
      srcset: picture.srcset,
      avifset: picture.avifset,
      alt: picture.alt,
      credit: picture.credit,
    })
  }

  const views = {}
  for (const point of points) {
    let best = null
    for (let i = 0; i < usable.length; i += 1) {
      const shot = usable[i]
      const dx = point.x - shot.x
      const dy = point.y - shot.y
      const metres = Math.hypot(dx, dy)
      if (metres < MIN_M || metres > MAX_M) continue
      // Bearing counts clockwise from north, and north is +y in game
      // coordinates, which is why x is the first argument here.
      const toPoint = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
      const off = Math.abs(((toPoint - shot.bearing + 540) % 360) - 180)
      if (off > shot.half) continue
      if (best === null || metres < best.metres) best = { i, metres }
    }
    if (best) views[point.name] = [best.i, Math.round(best.metres)]
  }

  // The camera geometry has done its job by now; the page only needs what it
  // prints and what it draws.
  const shipped = usable.map(({ x, y, bearing, half, ...rest }) => rest)
  return { shots: shipped, views }
}
