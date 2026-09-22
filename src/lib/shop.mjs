// The gear rail that sits at the foot of every page.
//
// Two rules decide what is in here, and both of them are about trust rather
// than about money.
//
// 1. Every link is an Amazon SEARCH link, never a product link. A search link
//    never 404s, never shows a price we checked months ago, and never sends a
//    reader to a listing that has since been taken over by a different seller.
//    The same reasoning is written out in src/lib/site.mjs next to amazonUrl.
//
// 2. Nothing here is dressed up as a recommendation from the record. This site
//    records what Rockstar has said about GTA 6. It has not tested a television.
//    So each item says what the thing is and why a GTA 6 player might want one,
//    and stops there. No scores, no "best", no invented testing.
//
// The picks change by section so the same three boxes are not stamped on 3,347
// pages. A reader on /vehicles gets a wheel; a reader on /gallery gets a
// capture card. It is the same shelf, turned to face the room the reader is in.

const GEAR = {
  ps5: {
    name: 'PlayStation 5',
    search: 'PlayStation 5 console',
    why: 'GTA 6 is a PS5 and Xbox Series game. It is not coming to PS4.',
  },
  xbox: {
    name: 'Xbox Series X',
    search: 'Xbox Series X console',
    why: 'The Series X is the full power machine. The Series S is cheaper and weaker.',
  },
  pad: {
    name: 'Controller',
    search: 'PS5 DualSense wireless controller',
    why: 'A second pad for a friend, or a spare for when the first stops holding charge.',
  },
  headset: {
    name: 'Gaming headset',
    search: 'wireless gaming headset PS5',
    why: 'Radio stations and street noise carry a lot of this series.',
  },
  tv: {
    name: '4K 120Hz TV',
    search: '4K 120Hz gaming TV HDMI 2.1',
    why: 'A 60 frames a second performance mode needs a screen that can show it.',
  },
  ssd: {
    name: 'Console storage',
    search: 'PS5 NVMe SSD 2TB heatsink',
    why: 'A modern Rockstar game is large. A stock console fills up fast.',
  },
  wheel: {
    name: 'Racing wheel',
    search: 'racing wheel PS5',
    why: 'For players who spend more of the game driving than shooting.',
  },
  capture: {
    name: 'Capture card',
    search: 'game capture card 4K60',
    why: 'For recording console footage off the machine itself.',
  },
  merch: {
    name: 'Rockstar merch',
    search: 'Rockstar Games merchandise',
    why: 'Shirts, caps and prints from the studio and its licence holders.',
  },
  poster: {
    name: 'Wall print',
    search: 'Grand Theft Auto poster',
    why: 'The cheap way to put the series on a wall.',
  },
  giftcard: {
    name: 'Store gift card',
    search: 'PlayStation Store gift card',
    why: 'The simple way to load money onto an account before release day.',
  },
  chair: {
    name: 'Gaming chair',
    search: 'ergonomic gaming chair',
    why: 'An open world game is a long sitting game.',
  },
}

// Which three items each part of the site shows. The key is the first segment
// of the path. Anything not listed falls back to DEFAULT_PICKS.
const BY_SECTION = {
  vehicles: ['wheel', 'pad', 'tv'],
  characters: ['headset', 'merch', 'poster'],
  soundtrack: ['headset', 'tv', 'giftcard'],
  weapons: ['pad', 'headset', 'chair'],
  gameplay: ['pad', 'tv', 'chair'],
  wildlife: ['tv', 'poster', 'merch'],
  locations: ['tv', 'ps5', 'poster'],
  landmarks: ['tv', 'ps5', 'poster'],
  businesses: ['merch', 'giftcard', 'poster'],
  brands: ['merch', 'poster', 'giftcard'],
  editions: ['ps5', 'giftcard', 'merch'],
  map: ['tv', 'ps5', 'poster'],
  'real-places': ['tv', 'poster', 'merch'],
  'trailer-locations': ['tv', 'capture', 'poster'],
  gallery: ['tv', 'capture', 'headset'],
  trailers: ['tv', 'capture', 'headset'],
  news: ['ps5', 'xbox', 'giftcard'],
  newswire: ['ps5', 'xbox', 'giftcard'],
  updates: ['ps5', 'giftcard', 'ssd'],
  tracker: ['ps5', 'xbox', 'ssd'],
  confirmed: ['ps5', 'xbox', 'giftcard'],
  numbers: ['ssd', 'ps5', 'tv'],
  answers: ['ps5', 'pad', 'headset'],
  search: ['ps5', 'pad', 'headset'],
}

const DEFAULT_PICKS = ['ps5', 'pad', 'headset']

// The path is the page path, for example "/vehicles/cara-vw" or "/map".
export function shopPicks(path) {
  const section = String(path || '/').split('/').filter(Boolean)[0] || ''
  const keys = BY_SECTION[section] || DEFAULT_PICKS
  return keys.map((key) => GEAR[key]).filter(Boolean)
}
