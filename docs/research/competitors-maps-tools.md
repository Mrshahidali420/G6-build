# Competitor teardown: GTA 6 map and tracker/tool sites

Date: 23 Sep 2026 (launch is 19 Nov 2026, 57 days out).
Method: raw HTML fetched with PowerShell `Invoke-WebRequest` (no JS run), robots.txt and sitemap.xml counted, WebSearch `site:` spot checks, GitHub API for the datasets. "Words (no-JS)" is the visible text a crawler gets before any script runs, nav and footer included. Every number below was read from a file fetched today; anything I could not verify is marked as such.
Inputs: `docs/research/serp-census-2026-09-23.md` (which sites rank for "gta 6 map", "gta 6 interactive map", "gta 6 tracker", "gta 6 countdown", "gta 6 locations").

---

## The big finding first: most of this niche runs on one open dataset

**rolux/gtadb.org** (GitHub, pushed 22 Sep 2026) is the source code of map.gtadb.org, "a collaboratively editable map of landmarks found in Grand Theft Auto and their real-world counterparts". The README says: "You are welcome to use the landmark data, photos or map tiles for your own purposes. Please do not fetch live data or media from gtadb.org – simply `git pull`." Licence line: **"MIT (code) / CC BY 4.0 (data). Attribution: gtadb.org and all contributors."**

- `map/data/6/landmarks.json` (565 KB): **2,819 GTA VI landmarks**, keyed L1..L2819. Each record has the in-game name and area, in-game x/y, **a real-world street address (1,662 of them)**, real lat/lng, tags, and edit timestamps. Example: `L1` = "Washington Beach, Vice Beach" ↔ "The Ritz-Carlton Bal Harbour, 10295 Collins Ave, Bal Harbour, FL 33154".
- Tags by count: l4 656, residential 293, **unconfirmed 288**, l1 200, retail 162, transportation 149, industrial 87, demolished 81, natural 80, hotel 74, leisure 68, government 54, events 50, landmark 33, restaurant 27, enterable 26.
- **2,003 of the 2,819 names start with "?"** (the name is a guess). Only about 800 are properly named.
- Areas by count: Vice City 875, Vice Beach 470, Port Gellhorn 187, Key Lento 161, Hamlet 153, Mariana County 103, Ambrosia 88, Rialto Islands 72.
- `map/photos/6`: at least 1,000 files in the listing (the API caps at 1,000), paired as `L1,ig.jpg` (in-game) and `L1,rl.jpg` (real life).
- `maps/tiles/6`: several tile sets named after community map makers (yanis v15/v16, dupzor, martipk, rickrick, aiwe).

Who is built on it:
- **map.stateofleonida.net**: its sitemap has 2,779 `?marker=L…` URLs, the same L-ids. Marker L1's meta description is the Ritz-Carlton address, word for word.
- **gtavimap.com**: its /credits page says the base tiles are "sliced and re-encoded as 256×256 WebP from the rolux/gtadb.org original tile set … Licence: CC BY 4.0", and its POI coordinates are "inspired by" the gtadb landmark data.
- **gtatracker.gg /vi/maps/leonida**: 1,505 markers, 20 categories. The filter names (Residential, Hotel, Office, Retail, Restaurant, Leisure, Government, Public, Landmark, Events, Transportation, Industrial, Construction, Agriculture, Natural) are the gtadb tag set. I have not verified that it uses gtadb data; the match is circumstantial.

**What this means for us:** the "real places" angle that our /real-places page covers with 11 entries has a CC BY dataset of 1,662 address-matched landmarks behind it, and **no competitor gives those landmarks crawlable pages.** They all show them inside a JS map. That gap is the main opportunity in this report.

---

## Per-site notes

### map.stateofleonida.net (State of Leonida, "by the Mapping Community")
- **What it does:** Leaflet map with gtadb landmarks, trailer-frame markers (`?marker=trailer1_021` "Jason & Lucia in Car"), screenshot markers (`?marker=screenshots_039` "Canyon"), a news feed (`?news=…`), a live X/Y cursor readout and a countdown. It links out to map.gtadb.org and gta.wiki. EN and DE.
- **Indexable pages:** the sitemap lists 2,785 URLs, and **all of them are query strings on one page** (`?marker=L1` … `?marker=L2779`, 16 `?news=`). Each marker URL server-renders its own `<title>`, meta description and `Place` + `GeoCoordinates` JSON-LD, and canonicals to itself. The body is still the same app shell, **52 words with no H1**. WebSearch `site:` shows Google has indexed some of them (L530 "Mount Kalaga, Lummox County", trailer1_001, screenshots_039).
- **Schema:** Organization, WebSite, WebApplication, Offer; Place and GeoCoordinates on marker URLs.
- **Money:** AdSense.
- **Repeat-visit hooks:** the countdown, news markers, and new markers as the community maps more.
- **Weak spots:** 2,785 near-duplicate thin URLs built on query parameters, no H1, and no text beyond the title and meta. This is the site to beat with real static pages.

### gtatracker.gg (strongest tool site in the group)
- **What it does:** a GTA 5 and GTA 6 hub covering a database, a Leaflet map (`/vi/maps/leonida`, 1,505 markers and 20 categories, "Add marker", "Sign in", a "0 % found" progress counter, routes and waypoints according to its meta), tools (`/vi/tools/compare` for up to six items side by side, `/net-worth`, `/upgrades`, `/weapon-mods`), `/vi/population` (a player-count page that pre-launch shows a countdown plus Twitch viewers), tier lists, guides and news.
- **Indexable pages:** sitemap.xml has 1,980 URLs (GTA 5 db 1,442, GTA 6 db 464). GTA 6 db buckets: vehicles 219, characters 49, wildlife 45, weapons 39, map-locations 33, equipment 22, activities 18, radio-stations 17, gangs 16, properties 6. The census has its gang page ranking for "ptt youngins gta 6".
- **The map page is JS-only:** 79 words without JS, no H1, and only CreativeWork schema. Its map-locations list has just 33 entries, labelled "Official" or "Datamined".
- **Titles and meta:** keyword-first titles, e.g. "PTT Youngin$ in GTA 6: Confirmed Vice City Gang" and "GTA 6 Player Count - Live Launch Countdown & Tracker (2026)".
- **Schema:** Thing and BreadcrumbList on db pages; the tools pages add FAQPage; the map-comparison article (3,363 words, author "Abdullah Jawad", dated 2 Sep 2026) adds Article, Person, ItemList and FAQPage.
- **Clever growth play: `/embeds`.** It offers free, no-key embeds of item cards, the full map and a player-count widget, plus WordPress URL auto-embed. Every embed is a backlink.
- **Honest labelling:** `/vi/db/collectibles` is set to **noindex** while it is empty ("0 collectibles … Most GTA 6 data is still pre-launch"). That is a sensible habit.
- **Money:** AdSense and GTM.

### tracker.gg/gta6
- Returned 403 to our fetcher (Cloudflare), so I could not read its HTML.
- WebSearch `site:` shows these pages: /gta6, /locations, /characters, /vehicles, /cheats, /previews, /release-date, /trailers, **/trailers/netflix-extended-look ("Every Shot, Scene by Scene")**, and character pages such as /characters/boobie. The census has its location pages (megamundo, electric-fang-tattoo) ranking for their names.
- Its search snippet describes "each [trailer] broken down shot by shot with timestamps, stills and every vehicle, weapon and location tracked in it". That is the same idea as our /trailer-locations page, with a much stronger domain behind it.

### exploregta6.com
- **What it does:** a Leaflet map fed from `api/locations`, 40 locations, "Submit Location" and "Report Error" links, and a "57 d 8 h" countdown in the header.
- **Indexable pages:** sitemap has 100 URLs (locations 41, news 24, characters 20). Location pages are server-rendered at about 560 words with Article, FAQPage and Organization schema. Its airport page ranks for "vice city airport gta 6" (per the census).
- **Weak spots:** the page content is templated filler. The airport page gives "90% confidence", "Map Coordinates -69.5000, 19.5000", "Confirmed 0 / Trailer 27" and "286 views", and its FAQ answers restate the one-line description. It has 0 confirmed entries by its own count. Titles are good ("Vice City International Airport — GTA 6 Location | ExploreGTA6"). AdSense.

### gtavimap.com
- **What it does:** a Leaflet map on gtadb tiles (credited, CC BY 4.0). It is a "pre-launch teaser map" that will "swap to the official in-game map at GTA VI launch", with an email "Get early access" signup, a countdown, and EN/FR/ES.
- **Indexable pages:** sitemap has 135 URLs, which is 36 map places × 3 languages plus site pages. Place pages carry Place and VideoGame schema at about 200 words, with a "Quick Answer" box.
- **Invented content (the key weakness):** the page slugs and copy describe gameplay that does not exist yet. "Epsilon Beach House … wear all-blue robes to receive a hidden cash reward" (`/map/alien-cult/`), "Vice International Airport … start of every flight school side mission", plus missions like "airport-grand-theft" and "yacht-getaway". None of it is sourced. It also cross-links a network of sister sites (gtavionline.net, gta6vehicles.net, gta6cheatcodes.net).
- **No ads were found** in the HTML; the model is an email list.

### gta6map.io
- **What it does:** Next.js with a static preview image (`/map/map1-preview.jpg`, "Drag to pan · Scroll or pinch to zoom"), plus a countdown, a news timeline, characters, regions, and an Aug 2026 gameplay-reveal breakdown.
- **Languages:** 11 hreflang versions (en, zh-TW, zh-CN, ja, de, es, fr, ko, ru, pt, pl).
- **Indexable pages:** there is **no sitemap.xml (404)**, and robots.txt is 24 bytes. The pages are few (/news, /character, /region, /extended-look), about 370–1,370 words each. The homepage has FAQPage schema; the inner pages have none.
- **Why it ranks:** the domain name. It ranks for "gta 6 map" and "gta 6 interactive map" (census) and got a Notebookcheck.de write-up (via `site:` search).
- **Money:** AdSense.
- **Weak spots:** a thin map, no per-location pages and no sitemap.

### gta6map.net ("MapMap" / "VIMap")
- **What it does:** Next.js (the generator tag is v0.dev) with Firebase. It advertises "Suggest locations on the map", "Track collectibles … The tracker remembers your progress", a newsletter, and a "Mobile app, coming soon". It also has maps for GTA 5, GTA Online and GTA 4.
- **Indexable pages:** 34 URLs, the latest lastmod Sep 2025, so the site is stale. The map page is **9 words without JS** ("Loading map…") yet declares **AggregateRating** plus WebApplication and Offer schema. A rating with nothing behind it is a spam signal.
- It blocks SEO bots and facebookexternalhit in robots.txt.

### gta6map.xyz ("powered by GameAssist")
- **What it does:** Nuxt, with a homepage grid of 6 regions and about 30 category hubs (ammu-nations, tattoo-parlors, barbers, golf, yoga, strip-clubs, huntings…) and a Discord.
- **Indexable pages:** 19 URLs, including test pages left in the sitemap (`/yanis-v15`, `/inspector-test`).
- **Broken content:** the region meta description leaks raw markup (`::intro{title="Vice City" map-focus-region=…`), and `/countdown-vi` says "Page Content Not Created Yet" under a hard-coded "$69.99 Est. Retail MSRP" Amazon pre-order block (`amazon.com` affiliate links).
- **Weak spots:** a good category skeleton with almost nothing in it yet.

### gta6database.com
- **What it does:** a map plotting 76 known locations (per its /map copy), filterable by category and confirmation status, with a text list of every location under the map (940 words and 64 internal links in the HTML).
- **Indexable pages:** 372 URLs (vehicles 185, locations 67, weapons 41, characters 19). The locations hub shows "67 entries · 29 confirmed · 38 unconfirmed · 0 rumored" and explains "confirmed" as naming the Rockstar artefact the entry came from. It has ItemList schema.
- **Staleness:** lastmod stops at 25 Jul 2026 and the page reads "Last updated Jul 18, 2026", so nothing has changed since.
- **Also:** a `/submit` page. This is the closest competitor to our sourcing stance.

### allaboutgta.com
- **What it does:** a Lovable-built database with a /map hub and 6 region pages plus /map/counties and /map/gloriana.
- **Indexable pages:** 138 URLs.
- **Trust features:** status labels (official, reported, leaked, rumoured), plus /how-we-verify, /corrections and /editorial-policy pages. Its robots.txt explicitly allows GPTBot, PerplexityBot and Google-Extended.
- **Schema:** WebSite + SearchAction, VideoGame, FAQPage and BreadcrumbList.
- **Money:** AdSense.

### gta6tracker.live (the strongest countdown/tracker page)
- **What it does:** Astro v7, with **the countdown baked into the `<title>`** ("GTA VI in 57d 08h 01m | GTA6 Tracker") and browser push notifications ("Enable notifications"). It shows **prediction-market odds (Kalshi)**, a local release-time page (5:00 AM UTC), and a Rockstar Newswire feed. It embeds a MapLibre map from stateofleonida.
- **Tools:** `/tools/release-map` and `/tools/vi-icon-generator`, plus `/db/marketing-timelines` and a media gallery.
- **Weak spots:** no robots.txt and no sitemap (both 404), and no schema.

### vicountdown.com
- **What it is:** a Fourthwall merch store with a countdown, news, characters, locations and time-zone pages, 13 sitemap URLs, and amzn.to affiliate links.
- **Why it matters:** it ranks for "gta 6 release time" and "little cuba" (per the census), so the domain name is doing the work.
- **Money:** merch plus Amazon affiliate.

### map.gtadb.org
- A landmarks map for GTA IV, V and VI. Its HTML is a 6-word shell. It is the upstream source for most of this group; see above.

---

## 1. COPY: ideas to take

1. **A sourced status label with counts on every hub** (gta6database.com: "67 entries · 29 confirmed · 38 unconfirmed"; allaboutgta: official, reported, leaked, rumoured). We already source everything. Show the counts at the top of /map, /real-places and hubs, because it is the trust signal their visitors respond to.
2. **An embeds page** (gtatracker.gg /embeds). Offer a copy-paste countdown widget, a "real place" card and a map-dot card that link back to us. It is the cheapest way to earn backlinks from bloggers in the 57 days before launch.
3. **The countdown in the page title and a notification opt-in** (gta6tracker.live). "GTA VI in 57d 08h" in the `<title>`, rebuilt daily by our robot. Add a web-push or email "tell me at unlock" signup (gtavimap's early-access form, gta6map.net's newsletter), which gives us a repeat-visit channel for launch week.
4. **A trailer shot-by-shot breakdown page per trailer** (tracker.gg/gta6/trailers/netflix-extended-look), with timestamps, stills and every tagged entity. Our /trailer-locations data can produce one page per trailer, including the Extended Look.
5. **Honest noindex on empty post-launch sections** (gtatracker's collectibles page). Build /collectibles, /checklist and similar pages now but noindex them until there is data, then flip them on launch day.
6. **A map-size comparison drawn to scale**, labelled official, community or derived (gtatracker /maps/gta-6-map-comparison, 3,363 words and cited). This fits our /gta-6-map-size page; the added value is the scale drawing and the confidence label on each figure.
7. **Category hubs by place type** (gta6map.xyz: ammu-nations, tattoo-parlors, barbers, golf…). Group our business and place entities into "every [type] in GTA 6" hubs.

## 2. BEAT: where we can do better

1. **A static indexable page per landmark versus their JS-only or query-string maps.** stateofleonida has 2,779 `?marker=` URLs with no H1 and 52 words; gtatracker's map is 79 words; gta6map.net's is 9. Our /map dots and real-places entries each get a real HTML page: H1, in-game name, area, real-world counterpart and address, official screenshot, source, a static mini-map image, Place + GeoCoordinates schema, and links to neighbouring entries. With the gtadb data (CC BY) that is up to about 800 named landmarks (skip the 2,003 "?" names), each targeting "[place] gta 6" and "[place] gta 6 real life".
2. **Real sourcing versus invented gameplay.** gtavimap invents mission and reward text; exploregta6 prints fake confidence percentages and coordinates. Put the evidence on the page (the trailer timestamp, screenshot or newswire item) and say plainly "not shown by Rockstar yet" where that is true. That beats them on helpful-content and E-E-A-T grounds.
3. **A sitemap and fresh lastmods.** gta6map.io and gta6tracker.live have no sitemap, gta6database stopped on 25 Jul, and gta6map.net stopped in Sep 2025. Our daily robot plus the sitemap is already better. Keep lastmod honest, meaning it changes only when the content changes.
4. **A real-places hub at scale.** leftdownrightup.co.uk owns "map vs real florida" (census), and our /real-places has 11 entries. Expand it to one hub per real city (Miami Beach, Brickell, Key West…) listing every matched landmark with its address. No competitor gives this text form.
5. **Pre-built post-launch pages, ready to switch on.** Everyone promises "100% completion" and collectible tracking, and nobody has content. Have templates ready (a collectible type hub, a per-item page, and a checklist with localStorage progress, which is a static-site-friendly version of gtatracker's sign-in tracker) so the pages go live within hours of real data appearing.
6. **Clean schema.** Do not declare AggregateRating or Offer with nothing behind it (gta6map.net). Use Place, ItemList, BreadcrumbList and VideoGame.

## 3. DATA NEEDED: ideas that need data we do not have

| Idea | Dataset | Where / search terms | Usable pre-launch? | Licence notes |
|---|---|---|---|---|
| Per-landmark pages + real-address hubs | gtadb GTA VI landmarks (2,819 entries: in-game x/y, real address, lat/lng, tags) | GitHub `rolux/gtadb.org` → `map/data/6/landmarks.json`; `git sparse-checkout set map/data/6`. Searches: "gtadb", "gta 6 map", "gta vi landmarks" | **Yes, today** | **CC BY 4.0 (data)**: an attribution line "gtadb.org and all contributors" on every page that uses it, plus a credits page. README asks for `git pull`, never live fetches. Use only named entries (not "?") and keep their `unconfirmed` tag visible. |
| Real-life vs in-game photo pairs | gtadb `map/photos/6` (`L#,ig.jpg` / `L#,rl.jpg`) | same repo, `map/photos/6` | Yes | **Risky.** The ig shots are Rockstar frames, which is fair-use territory like our official screenshots. The rl photos may come from Street View, and Google's terms do not allow reuse. Not verified; do not republish rl photos without checking where each came from. Link out to it instead. |
| A proper zoomable map base | Community map tiles (yanis v15/v16, dupzor, martipk, rickrick) | `rolux/gtadb.org` → `maps/tiles/6`; `rolux/gta6map` (latest.svg / latest.png, "GTA VI Community Map", no licence file shown); `gta6map/gta6map.github.io` (says "Public Domain", last pushed 18 Jul 2025, so stale). Searches: "gta 6 map tiles", "leonida map", "gta vi community map", "gta 6 mapping project" | Yes | gtadb tiles fall under its CC BY 4.0 (gtavimap credits it that way). rolux/gta6map has no licence in the repo; ask before use. **Do not use** `rywards/leonida-map-downloader`: it scrapes stateofleonida.net and has no licence. |
| Geo lookups for our existing 731 map points | Nearest gtadb landmark by x/y | Join our `src/data/map-points.json` (x/y) to gtadb x/y. First check whether both use the same coordinate frame; this is unverified. | Yes, once the frames are aligned | Same CC BY attribution. |
| Collectibles, activities, shops, 100% checklist | Post-launch collectible coordinates | Nothing exists yet. Watch GitHub for "gta 6 collectibles json", "gta vi collectibles", "gta6 map data", "leonida geojson" after 19 Nov; also the gtadb repo and the stateofleonida Discord. Kaggle: "gta 6" (nothing found; not searched in depth). | **No.** Launch day or later. | Take facts only (coordinates of in-game items are facts). Write our own text and credit the source. Do not copy another site's marker database wholesale. |
| Official in-game map image | Rockstar's in-game map or paper map | Only exists after launch (or in the Rockstar site art) | No | Rockstar copyright; a screenshot of it under fair use at most. Our drawn ground stays the safe base. |
| Prediction-market odds widget | Kalshi / Polymarket market for GTA 6 date | Kalshi public API (as gta6tracker.live shows) | Yes, but it matters less now the date is fixed | Check the API terms; it is off-topic for us, so low priority. |

GitHub searches already run (23 Sep): "gta 6 map" → gta6map/gta6map.github.io, rolux/gta6map, jahid611/gta6map (Next.js + Leaflet + Supabase, 0 stars); "leonida map" → rywards/leonida-map-downloader; "gtadb" → rolux/gtadb.org (7 stars, MIT). "gta vi map", "gta6 geojson" and "gta 6 mapping project" returned nothing. **No GeoJSON release exists**; gtadb's landmarks.json is the de facto dataset.

---

### Sources
- Fetched HTML, robots.txt and sitemaps (23 Sep 2026): gta6map.io, gta6map.net, gta6map.xyz, exploregta6.com, gtavimap.com (incl. /en/credits/), gtatracker.gg (incl. /embeds, /vi/maps/leonida, /vi/tools, /vi/db/collectibles, /maps/gta-6-map-comparison, sitemap-database.xml), map.stateofleonida.net, map.gtadb.org, gta6tracker.live, vicountdown.com, gta6database.com, allaboutgta.com. tracker.gg returned 403 and was read only through WebSearch `site:tracker.gg/gta6`.
- GitHub API: https://github.com/rolux/gtadb.org (README, licence, `map/data/6/landmarks.json`), https://github.com/rolux/gta6map, https://github.com/gta6map/gta6map.github.io.
- Local working copies (scratchpad, not committed): `...\scratchpad\comp\*.html`, `landmarks6.json`.
