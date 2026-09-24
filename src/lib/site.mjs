// Single source of truth for the site identity.
// Change SITE_URL here and the config, sitemap, canonical tags and JSON-LD all follow.
// Lesson 2 from LESSONS-FROM-MANHWAINDEX.md: never keep two lists.

export const SITE_URL = 'https://gta6record.com'
export const SITE_NAME = 'GTA 6 Record'
export const SITE_TAGLINE = 'Every confirmed Grand Theft Auto VI fact, with its source'

// Google Analytics 4 measurement id, from the property made 2026-09-19.
export const GA_MEASUREMENT_ID = 'G-7ZVE3B9Y17'

// AdSense publisher id, from the account opened 2026-09-19.
// This alone turns on the AdSense script tag and makes the build write
// /ads.txt. No ad unit renders until ADSENSE_SLOTS below are filled in, which
// is deliberate: the reviewer needs the tag on the page, not a live ad.
export const ADSENSE_CLIENT = 'ca-pub-2789392733984505'

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
// `nav` is the label the header row uses. The full title is the page title and
// the words a search engine reads; the header needs the shortest word that is
// still unambiguous, because eleven full titles in one row run off the screen.
export const HUB_TYPES = [
  { type: 'character', slug: 'characters', title: 'GTA 6 Characters', nav: 'Characters' },
  { type: 'vehicle', slug: 'vehicles', title: 'GTA 6 Vehicles', nav: 'Vehicles' },
  { type: 'location', slug: 'locations', title: 'GTA 6 Map and Locations', nav: 'Locations' },
  { type: 'song', slug: 'soundtrack', title: 'GTA 6 Soundtrack', nav: 'Soundtrack' },
  { type: 'business', slug: 'businesses', title: 'GTA 6 Shops and Businesses', nav: 'Businesses' },
  { type: 'brand', slug: 'brands', title: 'GTA 6 Brands and Manufacturers', nav: 'Brands' },
  { type: 'landmark', slug: 'landmarks', title: 'GTA 6 Landmarks', nav: 'Landmarks' },
  { type: 'weapon', slug: 'weapons', title: 'GTA 6 Weapons', nav: 'Weapons' },
  { type: 'gameplay_feature', slug: 'gameplay', title: 'GTA 6 Gameplay Features', nav: 'Gameplay' },
  { type: 'edition', slug: 'editions', title: 'GTA 6 Editions', nav: 'Editions' },
  { type: 'wildlife', slug: 'wildlife', title: 'GTA 6 Animals and Wildlife', nav: 'Wildlife' },
]

// The pages that are not a catalogue hub but are still a whole section of the
// site. Before this list they existed only in the footer and in the phone
// menu, so a desktop visitor never saw nine of them.
export const RECORD_PAGES = [
  { slug: 'map', nav: 'Map', title: 'Map of Leonida' },
  { slug: 'answers', nav: 'Answers', title: 'Answers' },
  { slug: 'confirmed', nav: 'Confirmed', title: 'Confirmed and rumoured' },
  { slug: 'news', nav: 'News', title: 'News' },
  { slug: 'newswire', nav: 'Newswire', title: 'Rockstar Newswire' },
  { slug: 'trailers', nav: 'Trailers', title: 'Trailer breakdown' },
  { slug: 'trailer-locations', nav: 'Trailer map', title: 'Where the trailers were filmed' },
  { slug: 'gallery', nav: 'Screenshots', title: 'Official screenshots' },
  { slug: 'numbers', nav: 'Numbers', title: 'GTA 6 by the numbers' },
  { slug: 'real-places', nav: 'Real places', title: 'The real Florida behind GTA 6' },
  { slug: 'tracker', nav: 'Claim record', title: 'The claim record' },
]

// Types that exist in the data but never get their own page.
// release_fact rows are evidence behind the answer pages, not pages themselves.
// The four record pages that earn a place in the header row on their own,
// next to the two menus. They are the pages a visitor is most likely to want
// by name rather than to browse for. Every other section is one click away
// inside "The record", so nothing is hidden, and the row stays six items wide
// at every screen size. Six short words never need a second line.
export const NAV_SHORTCUTS = ['map', 'answers', 'confirmed', 'news']

export const NON_PAGE_TYPES = ['release_fact']

// Entity slug -> the answer page that owns its main search question. The
// answer page links down to the entity in its body; this links back up.
export const ENTITY_ANSWER_LINKS = {
  'vice-city': { href: '/gta-6-vice-city', label: 'GTA 6 Vice City: what Rockstar has confirmed' },
  'gta-6-ultimate-edition': { href: '/gta-6-ultimate-edition', label: 'Is the GTA 6 Ultimate Edition worth it?' },
  'gta-6-standard-edition': { href: '/gta-6-price', label: 'GTA 6 price in every country' },
}

// One hand-picked link from a page that already ranks well (Search Console
// position about 3 to 6) to a related page stuck at 8 to 20, with the anchor
// written in the words people search. One link per donor, checked by hand.
// Picked 24 Sep 2026 from 30 days of Search Console data. Keyed by path.
export const BOOST_LINKS = {
  '/soundtrack/mine-o-mine': { lead: 'Also on the GTA 6 soundtrack:', href: '/soundtrack/devil-woman', anchor: 'Devil Woman, the Cliff Richard song in GTA 6' },
  '/soundtrack/but-i-think-its-a-dream': { lead: 'Also on the GTA 6 soundtrack:', href: '/soundtrack/love-is-a-long-road', anchor: 'Love Is a Long Road in GTA 6' },
  '/soundtrack/se-me-nota-agarrame': { lead: 'Also on the GTA 6 soundtrack:', href: '/soundtrack/inner-light', anchor: 'Inner Light in GTA 6' },
  '/landmarks/stockyard': { lead: 'Elsewhere in Vice City:', href: '/landmarks/vice-city-international-airport', anchor: 'Vice City International Airport in GTA 6' },
  '/locations/belville': { lead: 'See every place on the', href: '/locations', anchor: 'GTA 6 map and locations page' },
  '/brands/ecola': { lead: 'Its rival brand:', href: '/brands/sprunk', anchor: 'what Sprunk is in GTA 6' },
  '/brands/vapid': { lead: 'A Vapid car on this site:', href: '/vehicles/dominator-asp', anchor: 'the Vapid Dominator ASP in GTA 6' },
  '/vehicles/ganado-retro-build': { lead: 'This truck comes with the Ultimate Edition. See', href: '/gta-6-ultimate-edition', anchor: 'what the GTA 6 Ultimate Edition includes' },
  '/businesses/electric-fang-tattoo-parlor': { lead: 'Buying early? See', href: '/gta-6-pre-order', anchor: 'how GTA 6 pre-orders work' },
  // Rumour posts Google already shows for a question, pointing at the page
  // that answers it with sources.
  '/tracker/gta-6-is-key-west-still-on-the-map-albeit-smaller': { lead: 'For what Rockstar has actually shown, read', href: '/is-key-west-in-gta-6', anchor: 'is Key West in GTA 6' },
  '/tracker/gta-vi-will-director-mode-make-a-grand-return': { lead: 'For what is confirmed so far, read', href: '/gta-6-director-mode', anchor: 'does GTA 6 have Director Mode' },
  '/businesses/ptt-youngins': { lead: 'PTT Youngin$ sits in Southside Vice City. Read about', href: '/locations/vice-city', anchor: 'Vice City in GTA 6' },
}

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
