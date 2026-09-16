// The fixed source list. Nothing outside this file is ever fetched, and
// nothing outside this file is ever allowed to appear as a link on a page.
//
// A source is a publisher, not a topic. The robot records that one of these
// outlets published something. It never records that the thing is true.

export const FEED_SOURCES = [
  {
    id: 'ign',
    outlet: 'IGN',
    feed: 'https://feeds.ign.com/ign/games-all',
    host: 'www.ign.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'gamesradar',
    outlet: 'GamesRadar+',
    feed: 'https://www.gamesradar.com/rss/',
    host: 'www.gamesradar.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'wired',
    outlet: 'WIRED',
    feed: 'https://www.wired.com/feed/rss',
    host: 'www.wired.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'pcgamer',
    outlet: 'PC Gamer',
    feed: 'https://www.pcgamer.com/rss/',
    host: 'www.pcgamer.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'eurogamer',
    outlet: 'Eurogamer',
    feed: 'https://www.eurogamer.net/feed',
    host: 'www.eurogamer.net',
    tier: 'TIER_2_MAJOR_PRESS',
  },
]

// Rockstar's own Newswire. Client rendered, so it has its own lane in
// scripts/robot/newswire.mjs. Same raw file shape, higher tier.
export const NEWSWIRE_SOURCE = {
  id: 'rockstar',
  outlet: 'Rockstar Newswire',
  page: 'https://www.rockstargames.com/newswire',
  host: 'www.rockstargames.com',
  tier: 'TIER_1_OFFICIAL',
}

// Strict on purpose. "GTA" on its own catches every older game in the series,
// and "Vice City" catches twenty years of GTA: Vice City coverage. A loose
// pattern here is how a record of one game turns into a general games feed.
export const MATCH = /grand theft auto vi|gta ?6|gta ?vi/i

export const ALL_SOURCES = [...FEED_SOURCES, NEWSWIRE_SOURCE]

export const ALLOWED_HOSTS = new Set(ALL_SOURCES.map((source) => source.host))

export const sourceById = new Map(ALL_SOURCES.map((source) => [source.id, source]))
