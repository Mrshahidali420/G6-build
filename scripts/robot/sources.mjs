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
  {
    id: 'taketwo',
    outlet: 'Take-Two Interactive',
    feed: 'https://ir.take2games.com/rss/news-releases.xml',
    host: 'ir.take2games.com',
    tier: 'TIER_1_OFFICIAL',
  },
  {
    id: 'playstation-blog',
    outlet: 'PlayStation Blog',
    feed: 'https://blog.playstation.com/feed/',
    host: 'blog.playstation.com',
    tier: 'TIER_1_OFFICIAL',
  },
  {
    id: 'xbox-wire',
    outlet: 'Xbox Wire',
    feed: 'https://news.xbox.com/en-us/feed/',
    host: 'news.xbox.com',
    tier: 'TIER_1_OFFICIAL',
  },
  {
    id: 'gamespot',
    outlet: 'GameSpot',
    feed: 'https://www.gamespot.com/feeds/news/',
    host: 'www.gamespot.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'polygon',
    outlet: 'Polygon',
    feed: 'https://www.polygon.com/rss/index.xml',
    host: 'www.polygon.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'kotaku',
    outlet: 'Kotaku',
    feed: 'https://kotaku.com/rss',
    host: 'kotaku.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'gameinformer',
    outlet: 'Game Informer',
    feed: 'https://www.gameinformer.com/rss.xml',
    host: 'gameinformer.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'gamesindustry',
    outlet: 'GamesIndustry.biz',
    feed: 'https://www.gamesindustry.biz/feed',
    host: 'www.gamesindustry.biz',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'rockpapershotgun',
    outlet: 'Rock Paper Shotgun',
    feed: 'https://www.rockpapershotgun.com/feed',
    host: 'www.rockpapershotgun.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'theverge',
    outlet: 'The Verge',
    feed: 'https://www.theverge.com/rss/index.xml',
    host: 'www.theverge.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'bloomberg',
    outlet: 'Bloomberg',
    feed: 'https://feeds.bloomberg.com/technology/news.rss',
    host: 'www.bloomberg.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'vgc',
    outlet: 'VGC',
    feed: 'https://www.videogameschronicle.com/feed/',
    host: 'www.videogameschronicle.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'pushsquare',
    outlet: 'Push Square',
    feed: 'https://www.pushsquare.com/feeds/latest',
    host: 'www.pushsquare.com',
    tier: 'TIER_2_MAJOR_PRESS',
  },
  {
    id: 'purexbox',
    outlet: 'Pure Xbox',
    feed: 'https://www.purexbox.com/feeds/latest',
    host: 'www.purexbox.com',
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
