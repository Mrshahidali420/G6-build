# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: people searching Google for one specific Grand Theft Auto VI fact before
the game launches on 19 November 2026. They arrive from a long tail query
("gta 6 release date", "gta 6 price in india", "is gta 6 on pc", "best ps5 for
gta 6"), on a phone, mid scroll, wanting the answer in the first screen. Most
will never see the home page.

Secondary: buyers researching a console, controller, headset, TV or SSD in the
run up to launch. Same arrival pattern, higher commercial intent.

Tertiary: the owner, who maintains the catalog from CSV files and needs the
data structure to stay machine readable.

## Product Purpose

A catalog of everything confirmed about Grand Theft Auto VI, where every single
entry shows where the fact came from. Success is a page that answers the query
in two lines, proves the answer, and is trusted enough that Google surfaces it
above the rumour mills.

## Positioning

The mechanism a rival could not truthfully copy: every entity and every claim
carries a four tier provenance label (confirmed by Rockstar, major press,
community identified, unconfirmed) plus the source URL and the date it was
checked. Competing GTA sites publish rumour and confirmed fact in the same
typeface with no distinction. Here the provenance is the design.

The site also states plainly what it does NOT have: no missions, no cheats, no
walkthroughs, no screenshots of its own. Nobody has played the game. Saying so
is part of the product.

## Operating Context

Static Astro 5 site, built from CSV data files, deployed to Cloudflare Pages at
gta6record.com. Traffic is expected to arrive overwhelmingly from Google, on
mobile, cold, with no brand recognition. The launch wave is a hard dated event:
19 November 2026.

Monetised by Google AdSense and Amazon Associates. Ad slots and affiliate
product cards are part of the page, not an afterthought, and must be designed
for rather than dropped in.

## Capabilities and Constraints

- 131 static pages today: 9 type hubs, ~103 entity pages, 23 answer pages,
  a news section, plus about, contact, privacy, search and 404.
- Data lives in `data/*.csv`, 21 columns, one row per entity. Pages are
  generated from it. Any new visual field must exist as a CSV column.
- Entity types: character, vehicle, location, song, business, brand, landmark,
  gameplay_feature, edition.
- Confirmed status values: OFFICIAL_CONFIRMED, PRESS_REPORTED,
  COMMUNITY_IDENTIFIED, UNCONFIRMED.
- Source tiers: TIER_1_OFFICIAL, TIER_2_MAJOR_PRESS, TIER_3_COMMUNITY,
  TIER_4_UNSOURCED.
- Fully static output. No server, no SSR, no database, no login.
- Pagefind powers search. Sitemap and IndexNow are wired.
- A strict Content Security Policy ships in `public/_headers`. Any new font,
  script or image host must be added there or it will be silently blocked.
- Build fails if two pages share a meta description.
- Hard house rule: no em dashes anywhere in published copy.

## Brand Commitments

- Name: GTA 6 Record. Domain gta6record.com. Both fixed.
- Voice: plain, short sentences, British neutral spelling, dates written as
  "19 November 2026". Honest to the point of bluntness about what is unknown.
- Not affiliated with Rockstar Games or Take-Two Interactive, and every page
  must be able to say so.
- The owner has accepted the use of official Rockstar press imagery on entity
  pages. Images are an approved part of the design.

## Evidence on Hand

- Real sourced data for ~103 entities, each with source_url, source_date,
  confidence and source_tier already populated.
- A verified facts table in `WRITER-BRIEF.md` with tier and URL per fact.
- Real dated news events with Rockstar Newswire, Bloomberg and press sources.
- No original screenshots. The owner has no PS5 or Xbox and has not played the
  game. Nobody has. Never imply otherwise.
- No traffic data, no rankings, no testimonials, no user numbers. The site is
  brand new. Never invent any.
- AdSense is not approved yet and the Amazon Associates tag is empty. No
  earnings claims of any kind.

## Product Principles

1. Provenance is the product. If a fact cannot show its source, it does not
   ship, and the interface must make the tier visible before the reader asks.
2. The answer comes first. Every page states its answer in the first screen,
   then proves it.
3. Say what is not known. An honest gap beats a confident guess, and the gaps
   are stated in the same voice as the facts.
4. Built for a stranger on a phone from a search result. The home page is not
   the entrance.
5. The data model is the site. Anything the design needs must be expressible as
   a CSV column, or it does not belong.

## Accessibility & Inclusion

No formal standard was set by the owner. Treat WCAG AA contrast as the floor,
since the audience reads on phones outdoors and the incumbent design is a dark
theme. Every provenance signal must survive without colour, because colour
alone cannot carry the site's core distinction.
