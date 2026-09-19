// Single source of truth for the site identity.
// Change SITE_URL here and the config, sitemap, canonical tags and JSON-LD all follow.
// Lesson 2 from LESSONS-FROM-MANHWAINDEX.md: never keep two lists.

export const SITE_URL = 'https://gta6record.com'
export const SITE_NAME = 'GTA 6 Record'
export const SITE_TAGLINE = 'Every confirmed Grand Theft Auto VI fact, with its source'

// Google Analytics 4 measurement id, from the property made 2026-09-19.
export const GA_MEASUREMENT_ID = 'G-7ZVE3B9Y17'

// AdSense publisher id. Empty until the account is approved.
// The script tag still ships from day one so the reviewer sees it wired.
export const ADSENSE_CLIENT = ''

// Ad unit ids, taken from the AdSense dashboard after the account is approved.
// One entry per placement, so a unit can be turned off by blanking its id
// without touching a page template. Nothing renders while an id is empty: an
// <ins> tag with no slot is an AdSense policy breach, not a placeholder.
export const ADSENSE_SLOTS = {
  // Between the article and the questions on an answer page.
  article: '',
  // Under the entity grid on a hub page and under the list on an index page.
  foot: '',
  // The home page, in its own band between the section tiles and the closing
  // explainer. A designed slot, so the page does not get one cut into it later.
  index: '',
}

// Entity types that get a hub page. The hub route and the sitemap both read this.
export const HUB_TYPES = [
  { type: 'character', slug: 'characters', title: 'GTA 6 Characters' },
  { type: 'vehicle', slug: 'vehicles', title: 'GTA 6 Vehicles' },
  { type: 'location', slug: 'locations', title: 'GTA 6 Map and Locations' },
  { type: 'song', slug: 'soundtrack', title: 'GTA 6 Soundtrack' },
  { type: 'business', slug: 'businesses', title: 'GTA 6 Shops and Businesses' },
  { type: 'brand', slug: 'brands', title: 'GTA 6 Brands and Manufacturers' },
  { type: 'landmark', slug: 'landmarks', title: 'GTA 6 Landmarks' },
  { type: 'weapon', slug: 'weapons', title: 'GTA 6 Weapons' },
  { type: 'gameplay_feature', slug: 'gameplay', title: 'GTA 6 Gameplay Features' },
  { type: 'edition', slug: 'editions', title: 'GTA 6 Editions' },
]

// Types that exist in the data but never get their own page.
// release_fact rows are evidence behind the answer pages, not pages themselves.
export const NON_PAGE_TYPES = ['release_fact']

// Amazon Associates tracking ids, created 16 September 2026, one per store.
// A tracking id is free and belongs to an account, so each site gets its own
// id and the earnings report stays readable.
//
// Only the US id is wired into links today. The other seven are recorded here
// so a per country link builder can be added later without opening Amazon
// again. The suffix is Amazon's, not ours: -20 US and CA, -21 the whole EU
// group, -22 Japan. The EU group shares one name space, which is why the
// German and the other European names carry a locale of their own.
export const AMAZON_TAGS = {
  us: 'gta6record-20',
  uk: 'gta6record-21',
  de: 'gta6record0e-21',
  fr: 'gta6recordfr-21',
  it: 'gta6recordit-21',
  es: 'gta6recordes-21',
  ca: 'gta6recordca-20',
  jp: 'gta6record-22',
}

export const AMAZON_TAG = AMAZON_TAGS.us

// Amazon search links, not product links. A search link never 404s and never
// shows a price we did not check. Set AMAZON_DOMAIN per market later if needed.
export const AMAZON_DOMAIN = 'www.amazon.com'

export function amazonUrl(query) {
  const url = new URL(`https://${AMAZON_DOMAIN}/s`)
  url.searchParams.set('k', query)
  if (AMAZON_TAG) url.searchParams.set('tag', AMAZON_TAG)
  return url.href
}

export const canonical = (path) => new URL(path, SITE_URL).href
