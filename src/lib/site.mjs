// Single source of truth for the site identity.
// Change SITE_URL here and the config, sitemap, canonical tags and JSON-LD all follow.
// Lesson 2 from LESSONS-FROM-MANHWAINDEX.md: never keep two lists.

export const SITE_URL = 'https://gta6record.com'
export const SITE_NAME = 'GTA 6 Record'
export const SITE_TAGLINE = 'Every confirmed Grand Theft Auto VI fact, with its source'

// AdSense publisher id. Empty until the account is approved.
// The script tag still ships from day one so the reviewer sees it wired.
export const ADSENSE_CLIENT = ''

// Entity types that get a hub page. The hub route and the sitemap both read this.
export const HUB_TYPES = [
  { type: 'character', slug: 'characters', title: 'GTA 6 Characters' },
  { type: 'vehicle', slug: 'vehicles', title: 'GTA 6 Vehicles' },
  { type: 'location', slug: 'locations', title: 'GTA 6 Map and Locations' },
  { type: 'song', slug: 'soundtrack', title: 'GTA 6 Soundtrack' },
  { type: 'business', slug: 'businesses', title: 'GTA 6 Shops and Businesses' },
  { type: 'brand', slug: 'brands', title: 'GTA 6 Brands and Manufacturers' },
  { type: 'landmark', slug: 'landmarks', title: 'GTA 6 Landmarks' },
  { type: 'gameplay_feature', slug: 'gameplay', title: 'GTA 6 Gameplay Features' },
  { type: 'edition', slug: 'editions', title: 'GTA 6 Editions' },
]

// Types that exist in the data but never get their own page.
// release_fact rows are evidence behind the answer pages, not pages themselves.
export const NON_PAGE_TYPES = ['release_fact']

export const canonical = (path) => new URL(path, SITE_URL).href
