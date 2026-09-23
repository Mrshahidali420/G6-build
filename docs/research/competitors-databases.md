# Competitor teardown — GTA 6 database / wiki sites

Written 23 Sep 2026 (57 days to launch). Method: pages fetched with a plain HTTP
client (no JS), sitemaps walked and counted, `site:` searches via WebSearch.
gta6bible.com and tracker.gg sit behind Cloudflare bot checks (403), so
gta6bible was read through a text proxy and tracker.gg only through search
results. Counts are sitemap counts, not Google index counts.

Sites: gtabase.com (GTA 6 section), gta6bible.com, tracker.gg/gta6,
gta6database.com, gta6index.com, sixwiki.com, wikigta6.com.

---

## Summary table

| Site | Stack | GTA 6 URLs in sitemap | Entity pages | Entity words | Sources shown | Monetization | Freshness |
|---|---|---|---|---|---|---|---|
| gtabase.com | Joomla, 4SEO | ~2,720 (of 9,282 site-wide); ~2,000 are vehicle *comparison* URLs | ~190 vehicles, 30 weapons, 18 characters, 17 radio stations, 15 animals, 16 side missions, 5 properties, 3 gangs | 150–340 | No (prose "confirmed in trailer 1") | Mediavine + VIP "remove ads" | Newest lastmod 21 Sep 2026 |
| gta6bible.com | WordPress custom theme, GAMURS network | ≥402 visible (201 posts, 88 vehicles, 22 weapons, 16 characters, 14 activities, 20 rumors, 7 regions) | ~150 | ~250 + images | "Image via Rockstar Games" only | Network ads, app, newsletter, accounts | Hub modified 22 Sep 2026 |
| tracker.gg/gta6 | tracker.gg platform | unknown (403) | vehicles, locations, characters, cheats, trailers | — | — | Tracker ads | Active |
| gta6database.com | Next.js | 372 (317 database) | 312 entries: 185 vehicles, 41 weapons, 19 characters, 67 locations, 12 missions | ~150 | **Yes**, a Sources block per entry | None seen | Stale: last entry 28 Jul 2026 |
| gta6index.com | Static (Hugo-like), Cloudflare | 211 (117 news, 40 database, 30 guides, 7 mini-games) | 40 | 600–740 | Evidence-status table, no links | AdSense | lastmod to 22 Sep |
| sixwiki.com | Next.js | 95 | ~55 (vehicles 7, weapons 11, characters 9, wildlife 13, gangs 8, locations 7) | 360–500 | Named outlets in prose (VGC, TheSixthAxis) | AdSense | lastmod to 22 Sep |
| wikigta6.com | WordPress + Yoast | 3,549 (1,617 posts = 507 × 7 languages incl. de/fr/pt/it/pl/tr; 1,610 tag pages) | ~250 EN posts | ~290 | No; cites "Sept 2022 leak" | AdSense + Patreon + Ko-fi | Last post 6 Aug 2026 |

---

## Per-site notes

### gtabase.com /gta-6/ — the strongest, the one to beat
- **Title pattern:** `Annis Hellion | GTA 6 Vehicle Stats, Price, How To Get`; `… | GTA 6 Boat Stats, Price, How To Get`; `… | GTA 6 Weapon Stats, Price, How To Get`; `Méndez | GTA 6 Characters Guide, Bio & Voice Actor`; `Cocoteo FM | GTA 6 Radio Station Songs & Tracklist`. Hub: `GTA 6 Cars: Full Confirmed Vehicle List & Stats`.
- **Meta pattern:** templated. "The X is a {class} vehicle that will be featured in Grand Theft Auto VI. This vehicle also appears in GTA Online / This is a brand new vehicle…"
- **Vehicle fields:** Vehicle Class, Manufacturer, **Based on (Real Life)**, Seats, Mass/Weight, Drive Train, Gears, **Game Edition** (e.g. Ultimate Edition), "Statistics: coming soon", GTA 6 trailer screenshots, GTA V screenshots, artworks, video, **Game Appearances** (GTA 6 / GTA Online), star rating (3.3 of 5, 3 votes), comments.
- **Features:** hub filter and sort (class, manufacturer, new vs returning, "296 confirmed vehicles"); **"Compare to…" dropdown on every vehicle page**; comparison URLs `/gta-6/vehicles/comparison/?vehicle1=a&vehicle2=b` (~2,000 in the sitemap, 3-way blocked in robots.txt); radio-station pages with an embedded player per track; "best melee weapons" list pages; screenshot and artwork galleries; cheats pages.
- **Schema:** Article + BreadcrumbList + ImageObject + Person + Organization on all; **Product + Brand + AggregateRating** on vehicles and weapons (a rich-result stars play that Google's policy does not really allow for video-game items).
- **Real-life vehicles** listed as entities (Volkswagen Jetta, Dodge Durango 3rd gen, Chrysler Town & Country) — cars seen in trailers, not in-game models.
- **Linking:** 100–190 internal links per page; "Compare to" lists 20+ same-class vehicles.
- **Weak spots:** thin (150–340 words); no sources; Mass/Drivetrain/Gears are GTA V handling values shown as GTA 6 facts; the weapon page's dateModified is 2022; "confirmed" rests on the 2022 leak; two URL schemes for the same vehicle (`/gta-6/vehicles/x` and `/vehicles/gta-6/x`); ~2,000 near-duplicate comparison pages.

### gta6bible.com — "#1 GTA 6 Wiki", GAMURS-backed
- **Title pattern:** `Pfister Neon GTA 6 — Sports Stats, Speed & Class – GTA6Bible`.
- **Vehicle fields:** class, manufacturer, **Estimated Top Speed**, seats, drivetrain, **Based On** (1955 Ford Fairlane Crown Victoria), Performance bars (top speed, acceleration, braking, handling, traction out of 10; placeholders at 5/10), **Spawn Locations**, "Available when GTA 6 launches" status, 4+ official screenshots, "More {class}", "More from {manufacturer}", **Related Rumors**.
- **Features:** a **Want / Owned** tracker ("Your Stash", needs an account), "Notify me" on entry changes, a community **rumor board** with reader-consensus status, UGC, **interactive map**, **relationship map** (who knows whom), **daily games** (Wanted = guess the character, Chop Shop = guess the vehicle, Wiretapper = fill in the quote), newsletter "The Vice Gazette", app, comments, taxonomy pages (vehicle-class, brand, character-type).
- **Content mix:** half the posts are "real-life GTA" police-chase news and "Can you X in GTA 6?" answer posts.
- **Weak spots:** estimated top speeds with no stated method; "This page is under construction"; performance bars are placeholders; no sources beyond "Image via Rockstar Games"; heavy JS and Cloudflare challenge.

### tracker.gg/gta6 (seen through search)
- Sections: vehicles, locations (incl. businesses such as Megamundo, Electric Fang Tattoo), characters, cheats, release date/countdown, **trailers broken down shot by shot with timestamps and stills, tracking every vehicle, weapon and location in each shot**, including the Netflix Extended Look.
- Titles: `X - GTA 6 Characters - GTA 6 Database`. Ranks on brand strength.

### gta6database.com — closest to our model
- **Title:** `Zion — GTA 6 Vehicles | GTA6Database.com`. Meta = the short description.
- **Fields:** Overview, Specifications (Manufacturer, Class, Based on), **Sources** (lists gtabase.com, gta.fandom.com), status badge (Confirmed / Unconfirmed / Rumored), "Last updated", 3-question FAQ, "More vehicles".
- **Features:** ⌘K search, evidence tiers with counts ("185 vehicles: 6 confirmed, 179 not yet"), "Recently added", interactive map with 76 pins that link to entries, missions page, regions.
- **Schema:** WebPage + Thing/Place/Person + BreadcrumbList; CollectionPage + ItemList on the hub.
- **Weak spots:** ~150 words per page; its "sources" are other fan wikis; no entries after 28 Jul; Next.js page weight 80–330 KB; no ads (not a business yet).

### gta6index.com
- Fields "At a Glance": acceleration, category, gta5 appearance, gta6 status, handling, manufacturer, real-world inspiration, top speed ("High"/"Medium"). An **Evidence Status table** (Detail / Status / Why it matters). Sections "How to read this entry", "Why it matters".
- **Schema:** FAQPage + BlogPosting + **Dataset + DataDownload** on every entity.
- **Weak spots:** no meta descriptions; no canonical; 40 entities; speculative stats ("top speed High"); filler mini-games (tic-tac-toe, connect four); generic title suffix repeated on every page.

### sixwiki.com
- Infobox: Type, Manufacturer, **Associated character** (Jason Duval, safehouse vehicle), Availability (pre-order bonus), **Announced date**. Prose names the outlet for each claim. Section "The real car behind it".
- Wildlife uses **real species names** (American Flamingo, Green Iguana, Tiger Shark). Gangs section (Heder smuggling operation, Raul's heist crew).
- **Weak spots:** no Article/Thing schema, no dates, ~95 URLs, no source links.

### wikigta6.com
- Slug pattern `ingot-gta-6-car`, `cougar-gta-6-animal`, `hunter-sniper-gta-6-weapon`. Title `GTA 6 Ingot Guide: Vulcar Station Wagon`.
- "Quick Facts" table copies gtabase's fields (class, manufacturer, based on, seats, mass, drivetrain).
- **7 language versions** with hreflang (507 URLs each). Got a paid Barchart press release.
- **Weak spots:** built on the 2022 leak; no sources; 1,610 thin tag pages; stale since August; only WebPage schema.

---

## 1. COPY — worth adding to gta6record.com

1. **"Based on (real life)" on every vehicle and weapon** — gtabase, gta6bible, wikigta6, sixwiki and gta6database all have it; it drives queries like "what car is the X based on". We have realWorldBasis on 0 of 268 vehicles. Add it as a labelled field with its source and tier (see DATA NEEDED 1).
2. **Trailer shot log: timestamp → entity** (tracker.gg). One page per trailer listing every shot with its timestamp and the vehicles, places and characters in it, and a "Seen at 1:42 in Trailer 2" line on each entity page. We already have trailers.json and camera-shots.json, so this is our own evidence and fits the sourcing rule.
3. **Vehicle compare pages** (gtabase). Do not copy all ~2,000 pairs. Build a small set of pairs people actually search for ("X vs Y", same class) with a static table, plus a "Compare with" block of same-class vehicles on each entity page. That block is also strong internal linking.
4. **Hub filters and counts by evidence tier** (gtabase, gta6database). Filter by class, manufacturer, new vs returning and **status** on /vehicles, and show the honest count ("268 listed: 8 officially confirmed"). gta6database proves the tier count builds trust.
5. **Edition / availability field** (gtabase "Game Edition", sixwiki "Availability", "Associated character"): which vehicles come with the Ultimate Edition, a pre-order bonus or a character's safehouse. We already have this data in keyFacts; promote it to a field and a filter, and add an `/editions/…` → vehicles list.
6. **Radio station pages** (gtabase `/gta-6/radio-stations/x`, 17 of them). A station → tracklist page type fits our song entities; add it once Rockstar names the stations.
7. **"More {class}" and "More from {manufacturer}" blocks** plus manufacturer pages (gta6bible `/brand/`, taxonomy pages). Cheap internal links to our 268 vehicles.
8. **Related rumors block, clearly marked unverified** (gta6bible). We can do this more honestly by linking our COMMUNITY_IDENTIFIED entries under their own heading.
9. **Interactive map pins that link to entity pages** (gta6database: 70 of 76 pins link to entries). Check that every map-points.json pin links to its entity.
10. **Title formula** "X GTA 6 — {Class} Stats, Speed & Class" / "X | GTA 6 Vehicle Stats, Price, How To Get". Our pages should put the entity name first and the answer the searcher wants second (real car, where to find it, which edition).
11. **Wildlife with real species names** (sixwiki). "American Flamingo", "Green Iguana" instead of "Flamingos" matches how people search.
12. Low priority: a daily guessing game (gta6bible "Chop Shop") for repeat visits; build only after launch traffic exists.

## 2. BEAT — where we can do better

1. **Sources.** Only gta6database lists sources per entry, and those are fan wikis. We have sourceTier + sources on all 750. Show them as links, the tier badge and "How we know" above the fold. That is our E-E-A-T lead; the others print GTA V handling numbers or 2022 leak claims as GTA 6 facts.
2. **Coverage.** gtabase ~190 vehicle pages vs our 268; nobody has businesses (we have 180), landmarks (120) or brands in depth. gta6database has 312 entries and has been stale since 28 Jul; sixwiki has ~55. Publish the gap list (businesses, landmarks) as hubs and push them for indexing.
3. **Thin pages.** Rival entity pages run 150–340 words, often "coming soon" or placeholder bars. Ours already carry FAQ, notKnown and howWeKnow. Keep a "What is not known yet" section: it answers "does GTA 6 have X" without inventing anything.
4. **Freshness.** gta6database (28 Jul) and wikigta6 (6 Aug) are stale. Show a visible "Last checked {date}", a public changelog (/updates) and a correct dateModified. Plan a launch-week update run: every "Community identified" entry gets re-checked against the real game on 19 Nov.
5. **Schema honesty and depth.** gtabase uses Product + AggregateRating on game items (risky); gta6index uses FAQPage + Dataset. Use Article/Thing + BreadcrumbList + FAQPage, and a Dataset for the downloadable list. Never fake rating stars.
6. **Speed.** gta6database pages are 80–336 KB of Next.js; gta6bible is a heavy WP site behind a Cloudflare challenge; gtabase makes 100+ requests with Mediavine. A static Astro site wins on Core Web Vitals.
7. **Duplicate URLs.** gtabase has two schemes for the same vehicle and ~2,000 comparison URLs; wikigta6 has 1,610 tag pages. Our one-URL-per-entity setup is cleaner. Keep it that way and do not add tag pages.
8. **Real-life places.** gtabase notes things like "the Stanier is inspired by the 1955 Oldsmobile parked on Ocean Drive". Our /real-places already gets an 11.8% CTR. Expand it to entity-level "real place" pairs using the landmark realWorldBasis (8 today).

## 3. DATA NEEDED

| # | Idea | Dataset that would supply it | Where / what to search | Pre-launch? |
|---|---|---|---|---|
| 1 | Real-life inspiration per vehicle (and weapon) | GTA Fandom wiki vehicle and weapon pages (CC BY-SA 3.0; the infobox and "Design" section say "based on…"). The same licence and route as our outlawdb import. | Fandom MediaWiki API: `gta.fandom.com/api.php?action=parse&page=<Vehicle>&prop=wikitext`; search Fandom for "Grand Theft Auto VI vehicles". GitHub: `gta vehicles real life`, `gta vehicle inspirations json`. | **Yes**. Label it COMMUNITY_IDENTIFIED with the wiki cited. Do not copy gtabase's text. |
| 2 | Top speed / seats / drivetrain / class for returning nameplates (Banshee, Infernus…) | **DurtyFree/gta-v-data-dumps** (1,036★, updated 19 Sep 2026): `vehicles.json` (10 MB: class, manufacturer, seats, max speed, acceleration, braking, traction), `vehicleHandlings.json`, `weapons.json`, `radioStations.json`. There is no licence file, so treat it as facts only and do not republish the file. Alt: zfbx/GTA5-Handling-Meta. | GitHub: `gta v data dumps`, `gta 5 handling meta`, `gta5 handling meta json`; Kaggle: `gta v vehicles dataset`. | **Only as "GTA V values"**, in a separate "In GTA V" box. Never as GTA 6 stats. Real GTA 6 stats only come after launch (in-game testing, then PC file dumps; PC release date not announced). |
| 3 | Trailer timestamps per entity | Our own frame-by-frame log (trailers.json, camera-shots.json), extended to one row per shot: trailer, mm:ss, entity ids. No public dataset exists; tracker.gg's breakdown is theirs. | GitHub `gta 6 trailer breakdown` returns nothing useful. Source = official Rockstar YouTube trailers 1, 2 and the Extended Look. | **Yes**. Our strongest original data. |
| 4 | Real species names for wildlife | Match trailer and wiki animals against a Florida species checklist: GBIF / iNaturalist Florida checklists, Florida Fish and Wildlife species lists. | GBIF API `species/search?q=` ; iNaturalist "Florida checklist"; GitHub `florida species list csv`. | Yes, as "real species this resembles", with the species ID cited. It is not a claim about the game. |
| 5 | Radio stations → tracklists | Rockstar's official station and album announcements; "GTA 6 The Album" (34 tracks, per gta6bible news); Spotify / Apple Music official playlists; Genius "Grand Theft Auto VI" soundtrack pages. | Search "Grand Theft Auto VI radio stations announced", Spotify "GTA VI Official". GitHub: `gta radio stations json`. | Partly: stations Rockstar names before launch. The full lists come at launch. |
| 6 | Character voice actors | Official credits after launch; before that only press-reported roles (e.g. Stephen Root, per gta6bible) and IMDb/Behind the Voice Actors entries. | IMDb "Grand Theft Auto VI (2026)" full credits; search "confirms GTA 6 role". | Only press-reported ones, tagged PRESS_REPORTED. Full credits at launch. |
| 7 | Vehicle and entity images | Official Rockstar screenshots and trailers (gallery.json: 9 today) as frame grabs under a fair-use / commentary rationale; Fandom images carry mixed licences. | rockstargames.com/VI screenshots; Newswire press assets. | Yes for official material; one image per entity where an official image exists (only 8 of 268 vehicles today). |
| 8 | Spawn locations / prices / "how to get" | Only exists after launch (gameplay). GTA V prices (DurtyFree `vehicles.json` has monetary value) are not GTA 6 prices. | After 19 Nov: in-game testing, community sheets; GitHub `gta 6 vehicle prices` after launch. | **No**. Build the empty field and the "Not known yet" line now, and fill it on launch week. |

Warning: GitHub searches for "gta 6 vehicles" / "gta 6 database" return only
spam "mod menu / spawner" repos (0 stars, created Sep 2026). They are malware
lures. Do not clone them.
