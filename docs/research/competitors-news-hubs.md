# Competitor teardown: GTA 6 news, hub and guide sites

Written 23 Sep 2026 (launch is 19 Nov 2026, 57 days away). Method: live HTML
fetched from each home page, robots.txt, every sitemap (URLs counted, lastmod
dates bucketed by week), and 3 to 4 article, guide or soundtrack pages per
site. Page facts (title, meta, H2s, JSON-LD types, author, outbound links,
word count) come from parser scripts. WebSearch `site:` checked sites that
would not load. Word counts are page text minus scripts and styles, so they
run high by about 150 to 300 words of nav and footer.

**About lastmod.** Several sites rewrite every lastmod on each build, so
their "per week" numbers measure deploys, not writing. Those are flagged below.
The Vice City Methods and GTA6Bible numbers come from per-URL dates that do
vary, so they are a fair measure of real output.

---

## Snapshot table

| Site | Live? | Sitemap URLs | Real cadence | Monetisation | Headline strength | Headline weakness |
|---|---|---|---|---|---|---|
| gta6central.gg | **DNS fails (NXDOMAIN) on 23 Sep** | n/a | n/a | n/a | Google still lists vehicle, weapon and radio pages | Down today. Its indexed snippets show invented pre-launch stats |
| leonidahub.net | yes | 182 (96 database, 34 news, 27 map, 8 guides) | low. All 140 lastmods are 22 Sep, which is the build stamp | none seen | Interactive collectible map with a personal checklist; countdown | Very thin pages (news 66 words, weapon 47 words) |
| leonidawire.com | **503 on home, sitemap and robots** | n/a | n/a | "no advertising" (privacy page) | Missions and garage URLs rank for long-tail names | Down today |
| gta6times.com | yes | 163 (99 `/gta-6/*` guides, 36 news, 4 tools, 4 compare) | ~3 to 6 news a week | affiliate "best gear" guides, retailer links | Best trust signals in the group | Low news volume |
| gta6post.com | only `www.` (apex has no A record) | 72 | none. Newest lastmod is 27 Jun 2026 | none seen | 10 per-country price pages that rank (Canada) | Stale. Schema says `datePublished 2026-11-19` and author "Rockstar Games" |
| vicecitymethods.com | yes | 476 (351 news) | **~50 to 70 news a week** (4 to 15 a day in Sep) | AdSense | Volume, tools suite, NewsArticle + Speakable | Templated AI-style news, no outbound sources, invented pre-launch data |
| gtaviinsider.com | yes | 57 | ~2 to 5 a week | AdSense + an Ezoic/Raptive-type ad stack | Long posts (1,500 to 2,400 words), one named author | Small, one writer |
| gtaintel.com | yes | 3,757 (2,752 `/games/*` across GTA IV, V and VI; 915 news; 37 quizzes; 23 faq) | lastmod refreshed in bulk; news is heavy | AdSense | News to entity cross-links, update logs, sourced news | Most of its size is older GTA games, not GTA 6 |
| leonidaverse.com | yes | 170 (84 EN + 84 FR) | stalled. Newest lastmod is 31 Aug | "Offer" schema on the home page | Bilingual EN/FR, sources block on analysis posts | Speculation posts ("our bet"), stalled |
| gta6bible.com | yes | 402 (88 vehicles, 22 weapons, 20 rumors, 200 root posts) | **~30 to 40 posts a week** | GAMURS network (Prima, Destructoid) cross-links, accounts, push | Calendar add, "Stash" accounts, apps | Off-topic "Vice Gazette" real-crime posts to pull traffic |
| grandtheft.gg | yes | 74 | stalled. Newest lastmod is 7 Sep | AdThrive (Raptive), dotgg.gg network | Ranks for "gta 6 platforms" | `/radio/` page is empty (18 words) |
| gtaboom.com soundtrack tracker | yes | (big GTA-series site) | tracker page maintained, modified 17 Sep | Raptive-type ads | **Owns "gta 6 songs"**: evidence labels + numbered references | Not GTA6-only; one long page, no per-song pages |

---

## Per-site notes

### gta6central.gg
- **Status:** `No such host is known` from PowerShell and from Bun fetch on 23 Sep 2026. Google still lists `/vehicles/benefactor-schafter-lwb/`, `/weapons/assault-rifle-mk2/`, and `/gta5/vehicles/ratel/` (the last is a GTA 5 page).
- **Content type:** database of "vehicles, weapons, clothing and radio tracks" with stats, prices, and community ratings (search snippet).
- **Weak spot:** the search snippets show exact stats for a game that is not out: Schafter LWB "$200,000, 155 mph" and Assault Rifle Mk II "damage 34". Rockstar has not published those numbers. They are made up, or copied from GTA 5.
- **For us:** if the domain stays dead, its database queries ("gta 6 database", "vehicles database") are open for the taking.

### leonidahub.net
- **Types:** 96 database entries, 34 news, 27 map pages, 8 guides (launch day, 100% completion checklist, map guide, Keys collectibles, best vehicles ranked, pre-order, Trailer 2 locations, character guide), and a countdown home page.
- **Length:** very thin. News post "day-one collectible map is ready" has 66 words. Weapon page "Grenade Launcher" has 47 words. Launch-day guide has 284 words (H2: Before launch / Launch morning / First 100%).
- **Schema:** NewsArticle (author = "Leonida Hub", an organisation), Product on weapon pages (wrong type), ItemList on the guides index, WebSite + SearchAction.
- **Hooks:** RSS. The launch-prep angle is a map with a "personal checklist" and "share progress". No newsletter or Discord found.
- **Weak spots:** thin; no named people; weapon entries typed as Product.

### leonidawire.com
- **Status:** 503 on every URL we tried on 23 Sep. Google lists `/news`, `/privacy`, `/imprint`, `/contact`. The imprint names one private operator. The site says it has no ads and no cross-site tracking.
- **What ranks (census):** `/jobs/ptt-youngins-illegal-goods-store`, `/garage/vapid-stanier-55`. These are exact-name pages, the same moat we use.

### gta6times.com (closest match to our model, and the strongest trust signals)
- **Types:** 99 evergreen `/gta-6/*` answer pages (price per country as `/gta-6/release-date/<country>`, file size, music, leaks, editions, countdown, development), 36 news posts, tools (countdown, price and pre-order tracker, Can I Run It, "creator tools", "just for fun"), `/compare/*`, `/retailers`.
- **Cadence:** about 3 to 6 news posts a week since July.
- **Length:** news about 900 to 1,000 words; guides 600 to 1,400 words.
- **Structure:** each news post opens with "Quick answer:", then the body, a **FAQ**, "More GTA 6 news", then a newsletter box. Guides end with a dated **Update log** (file size: 2026-07-05, 07-15, 07-16 entries).
- **Schema:** NewsArticle + FAQPage + **SpeakableSpecification** on news; Product + AggregateOffer + FAQPage on country price pages; NewsMediaOrganization + Person (founder) site-wide.
- **E-E-A-T:** a named founder-editor with a bio (Vijaygopal Balasa); news bylined "GTA6 Times News Desk"; a "Source desk" block on the home page; rumours written as "an unverified report". The leak tracker labels each item Confirmed / Reported / Rumor, with a source.
- **Freshness tricks:** "The verified road to launch" timeline on the home page (pre-orders now → 12 Nov pre-load → 19 Nov launch), dated update logs, and "observation date shown" on prices.
- **Launch prep:** a storage and pre-load planner (console model, free GB, Mbps, with a clearly labelled 150 GB *planning allowance*); per-country "local-midnight estimate" (e.g. Canada 12:00 am ET, with London and LA equivalents); a countdown with calendar add and an embeddable widget.
- **Soundtrack:** `/gta-6/music` is only 610 words: trailer songs, the in-game music scene, and "Radio stations (expected)" with a V-Rock t-shirt clue. It is weak.
- **Hooks:** newsletter "One email when a launch fact changes"; Discord (discord.gg).
- **Money:** "Best gear for GTA 6" hub (console, TV, monitor, headset, controller, PS5 SSD, chair); retailer and store links.
- **Weak spots:** low news volume; thin music page; country pages tagged `Product`/`AggregateOffer` carry rich-result risk.

### gta6post.com
- **Status:** apex has no A record; `www.` works. 72 URLs. Newest lastmod is **27 Jun 2026**, so the site is stale.
- **Types:** release date, timeline, pre-order, physical edition, Ultimate edition, price plus **10 country price pages** (US, UK, CA, AU, DE, FR, JP, BR, IN, MX), 12 character pages, 18 screenshot pages, trailers, platforms, missions, FAQ.
- **Length:** 400 to 700 words. Every page has an FAQ block.
- **Schema problem:** every page carries VideoGame schema with `datePublished: 2026-11-19` and author "Rockstar Games". That is the game's release date, not the page's, and it credits Rockstar as the page author. No person is named anywhere.
- **Why it still ranks:** exact-intent URLs (`/gta-6-price/canada/`) with the confirmed number in the title and meta ("CA$109.99 ... CA$139.99").

### vicecitymethods.com (the volume play)
- **Volume:** 476 URLs, 351 of them news. News lastmod by day, 9 to 22 Sep: 5, 8, 11, 8, 3, 11, 15, 7, 10, 7, 6, 5, 6, 4. **That is about 50 to 70 posts a week.**
- **Template:** every news post is about 1,000 to 1,150 words with the same H2s: *The Breakdown / Tactical Analysis / FAQ / Related Articles*. Titles are punchy rewrites ("R6 Siege Director Admits GTA 6 Will Gut Player Base", "GTA 6 Modding Rules: 4 Restrictions Set in Stone").
- **Schema:** NewsArticle + VideoGame + **Speakable** + Person, but the author is "Vice City Methods" (no real person).
- **Sources:** the only outbound links in the sampled posts are google.com (x3). No links to Rockstar, press, or the original report.
- **Rumour as fact:** the DualSense post says "per early unboxings" and "reportedly tuned specifically for DualSense … RAGE 9" with no citation. Its database claims "60+ vehicles with top speed specs, prices, and spawn locations", and its tools include a "Heist Payout Split Calculator" and "Business Profit ROI Calculator". None of that data exists before launch.
- **Tools:** interactive map, PC spec FPS estimator, best PC builds, console display guide, heist and business calculators, 100% completion tracker, PS5/Xbox cheat matrix, vehicle database finder (`/tools`).
- **Money and hooks:** AdSense; newsletter; X.
- **Signs of AI filler:** a fixed four-heading template, "here's the part most coverage is missing", speculative "Tactical Analysis" sections, and a volume no one-person site could write by hand.

### gtaviinsider.com
- WordPress, 57 URLs, one author ("Subrato"), about 2 to 5 posts a week. Posts run 1,500 to 2,400 words with a "Quick Answer" H2 and "confirmed and not confirmed" sections.
- **Soundtrack:** `/gta-6-songs-list/` lists the 14 Extended Look songs in a table with columns **Song / Artist / Timestamp / Scene-context** (e.g. "Pop Bottles, Birdman & Lil Wayne, 0:06–0:45, opens as Jason and Lucia walk toward a drug den"). It has 17 YouTube links. A good format.
- **Oddball long-tail:** "GTA 6 gas station diesel cost" reads the price off an in-trailer Xero Gas board ($5.22/gal ≈ $1.38/L). This is micro-detail mining that nobody else writes.
- **Schema:** Article (not NewsArticle), BreadcrumbList. Ads: AdSense plus an Ezoic/Raptive-type stack.
- **Weak spots:** the file-size page is headlined "Why GTA 6 File Size Is Smaller Than Expected?" before any official size exists, and the meta description is empty.

### gtaintel.com (another GTA6-branded news site from the census)
- 3,757 URLs, but 2,752 of them are `/games/*` entity pages across GTA IV, V and VI (cheats, missions, weapons). 915 news posts, 37 quizzes, 23 FAQ pages.
- **News quality:** the Miami Beach vote story runs about 1,900 words with plain H2s ("What the commission actually voted on … What happens next … The bottom line … **Update log**"). It cites miaminewtimes, cbsnews, pcgamer, kotaku. Byline "Adi - GTA Intel Newswire". Its dateModified (22 Sep) is later than its datePublished (15 Sep), and the log explains the change.
- **Entity pages** carry *About / Design / Sources / "Mentioned in 3 articles" / Compare / At a glance*. **The news-to-entity back-link is the idea worth copying.**
- **Schema:** NewsArticle + Person; HowTo on cheat pages; VideoGame + Thing on entities. Quizzes are an engagement play.

### leonidaverse.com
- Bilingual EN/FR (84 + 84 URLs); newest lastmod 31 Aug. News is analysis ("GTA 6: 25M units day one and $7.6B in 60 days?") with a **★ Sources** H2 and "What we still don't know / What to watch next" sections. It also runs opinion "bets" ("Our bet at the Gazette"). Bylined "TomyVerse". An AI companion map is marked up as WebApplication.

### gta6bible.com
- 402 URLs, about 30 to 40 a week in Aug and Sep. Part of the **GAMURS** network (cross-links to Prima Games, Destructoid, Gamepur, The Mary Sue, Operation Sports), which gives it borrowed authority.
- **Traffic trick:** the "Vice Gazette" section runs real-world crime stories ("Driver Flees on Foot After Crashing Into Two Cars in Wild Police Chase", Laredo TX) as GTA-flavoured news. It is off-topic.
- **Soundtrack:** "Every Song Featured in GTA 6's 26-Minute Extended Look" (about 880 words, a list; published 27 Aug, the day the Extended Look aired).
- **Hooks:** "Add the GTA 6 release date" to **Google Calendar / Apple / Outlook (.ics)**; free accounts to build a **"Stash"** (save vehicles and weapons, "track what you own once GTA 6 lands"); push notifications; iOS/Android app links; comments; Resend email.
- **Weak spot:** the Grenade Launcher page says "set to return … spotted in Trailer 2" but its title promises "Heavy Stats & Damage", which do not exist yet.

### grandtheft.gg
- 74 URLs, AdThrive ads, dotgg network. Posts run about 1,000 to 1,800 words; bylines Luna and Theo. `/radio/` is **18 words** (empty) but is titled "GTA 6 Radio Stations". The home page promotes "GTA 6: The Album Song List: All 34 Tracks (Confirmed and Leaked)". The price post is dated 1 Jan 2026 and was never updated after the June price reveal.

### gtaboom.com: "GTA 6 Radio Stations, Songs and Music Tracker"
URL `/the-complete-gta-6-soundtrack-tracker-updated-live-20ed`. About 2,250 words. Published 16 Jun 2026 by Ray Ampoloquio; the page says "Maintained by GTA BOOM Editorial · Sep 17, 2026".
- **Why it wins "gta 6 songs":** four sections (The Album / Evidence labels / Story-world music / Maintenance note), numbered footnote references (Rockstar trailers, the Extended Look, an X clip, artist posts), and a reader prompt: "What … evidence should be added or corrected?"
- **Evidence labels (the key idea):** *Official album track · Confirmed station · Radio clue · Direct artist statement · Campaign participation · Reported, unverified · Official video use.* Each row gets one label, and the page says that use in a trailer is "not proof of in-game radio placement".
- **Facts it records:** *GTA VI: The Album* has 34 original tracks, launching 19 Nov 2026, with 6 singles released so far. Its radio clues are the V-Rock logo on Jason's shirt and a Vice City FM bus-shelter ad in the Extended Look. It counts 20 licensed songs across Trailers 1 and 2 plus the Extended Look (6 in the trailers + 14 in the Extended Look).
- Heavy social embeds (instagram 20, youtube 9, tiktok 8, x 9 links). No Spotify embed. One long page, so each song has no page of its own.

---

## 1. COPY: ideas to take, where from, and why

1. **Evidence label on every soundtrack and tracker row** (gtaboom). Use the same seven labels on `/soundtrack` and `/tracker`. It is the clearest trust signal in the niche and it is why gtaboom ranks for "gta 6 songs". Our 19 song pages each get one status chip.
2. **Timestamp + scene table for trailer songs** (gtaviinsider). Add *Song / Artist / Video / Timestamp / Scene* to `/soundtrack`, and a timestamp line on each song page. Rockstar's own videos are the source, so every row can be checked.
3. **Dated "Update log" at the foot of each answer page** (gta6times, gtaintel). Put it on release-time, price, preload and platforms. It explains every `dateModified` change and gives Google a real reason to recrawl in the last 57 days.
4. **"Quick answer:" first line + FAQPage + Speakable** (gta6times, vicecitymethods). This also fixes problem #3 in KEYWORD-PLAN (question queries landing on pages that do not answer first).
5. **"Mentioned in N articles" on entity pages** (gtaintel). Link every `/news` and `/newswire` post back to the entity pages it names. That adds internal links to the 750 entity pages, which helps the "4 in 10 indexed" problem.
6. **Add-to-calendar (.ics + Google) and one launch-fact email** (gta6bible, gta6times). Offer "Add 12 Nov pre-load / 19 Nov launch to calendar" and "one email when a launch fact changes" on `/gta-6-release-time` and the preload page.
7. **Local-midnight table per country, with honest wording** (gta6times). Show "if storefronts unlock at local midnight, then …" with equivalent times in other cities, labelled an estimate until Rockstar posts the unlock hour.
8. **Storage and pre-load planner** (gta6times). Small client-side tool: console model + free GB + Mbps, then hours to download, using a clearly labelled planning allowance until the official size is out.
9. **Retailer / "where to buy" page per country** (gta6times `/retailers`, gta6post). Put official store links on our country price pages. This matches the Amazon block we already run.
10. **Micro-detail pages mined from official footage** (gtaviinsider's gas-price board). Our entity model already fits: a price board, a billboard or a shop sign, each with the source frame named.

## 2. BEAT: how we do better

1. **Soundtrack hub that beats gtaboom's one long page.** Keep the evidence labels, add per-song pages (we already have 19), plus an album page for the 34 tracks as each is named, and add stations the day Rockstar confirms them. gtaboom has no per-song pages, grandtheft.gg `/radio/` is empty, and gta6times `/music` is 610 words.
2. **Sourced where the volume sites are not.** Vice City Methods posts 50 to 70 a week with no outbound sources and invented vehicle speeds and heist payouts. gta6central shows invented stats. Our rule, "every claim sourced, no stats until the game ships", should be stated on each database page ("Stats: not published by Rockstar yet").
3. **Correct schema.** gta6post claims Rockstar as author with a Nov 2026 publish date; leonidahub types weapons as Product; Vice City Methods uses an organisation as author. Use real `datePublished`/`dateModified`, a named Person, and `VideoGame`/`Thing`/`CreativeWork` for entities.
4. **Freshness on country pages.** gta6post (stale since 27 Jun) and grandtheft.gg (price post dated 1 Jan) are the weak incumbents on "gta 6 price [country]". Dated observation lines plus update logs should beat them. gta6times is the one to watch.
5. **Stay on topic.** gta6bible pads with real-crime news, and gtaintel's size is mostly GTA IV and V. Our 750 GTA 6-only entity pages are a tighter topical signal. Keep `/news` strictly GTA 6.
6. **Depth over thin.** leonidahub's news and database pages are 47 to 66 words. Each of our entity pages needs a real paragraph plus a source line to stay out of "Discovered – not indexed".
7. **Launch-night rules, written now.** None of these sites has a published launch-night plan. We can pre-build `/gta-6-release-time` country sections and a "what unlocked when" log, then fill in real unlock times as players report them on 18 and 19 Nov.

## 3. DATA NEEDED: ideas that need data we do not have

| Idea | Dataset needed | Where to look (exact search terms) | Usable pre-launch? |
|---|---|---|---|
| Full album + radio station list | 34 album track titles, station names, DJs, per-station tracklists | GitHub: `"GTA VI" soundtrack json`, `gta6 radio stations json`, `gta vi album tracklist`. Kaggle: `GTA soundtrack`, `grand theft auto radio`. Also: Rockstar Newswire posts + `rockstargames.com/VI/music`, Spotify album API (`GTA VI The Album`), MusicBrainz release search "Grand Theft Auto VI" | **Partly.** 6 album singles are out now. The full album and stations come on 19 Nov. Build the schema now, fill it at launch |
| Trailer and Extended Look song timestamps | song, start–end time, scene, video ID | GitHub: `gta 6 trailer timestamps`, `gta6 extended look songs`. Source of truth is the videos themselves (Trailer 1, Trailer 2, Extended Look). gtaviinsider has 14 rows to cross-check | **Yes.** Can be built by watching the videos and noting times |
| Trailer shot-by-shot locations | frame timestamp → location → real-world match | GitHub: `gta 6 trailer frame analysis`, `gta6 map geojson`, `leonida map geojson`. Reddit r/GTA6 "trailer 2 location breakdown". The map.stateofleonida.net community map | **Yes**, with a timestamp as source for each row |
| Voice and performance cast | actor ↔ character, source per credit | GitHub: `gta 6 cast json`. Wikidata query: `Grand Theft Auto VI` (Q-id) cast member (P161). IMDb title page for GTA VI. Kaggle: `video game voice actors` | **Partly.** Only publicly credited actors now. Full credits after launch |
| Vehicle, weapon and business stats (speed, price, damage) | in-game numbers | GitHub: `gta 6 vehicles json`, `gta6 handling meta`, `gta vi weapon stats`. Kaggle: `gta vehicles dataset` (GTA V-era datasets for comparison only, never presented as GTA 6) | **No.** Only after 19 Nov. Do not copy the invented numbers other sites show |
| Regional prices | official price per store and country, with date seen | PlayStation Store / Xbox Store country pages; GitHub `psn store price scraper`, `xbox store price api`; SteamDB-style trackers do not cover consoles | **Yes.** Record the observation date on each row |
| Unlock time per region | actual unlock hour per store region | Rockstar Support / PlayStation Blog announcement; community logs on launch night (r/GTA6, X) | **No.** Only near 12 to 19 Nov |
| Final file size | GB per platform | PlayStation Store listing size, Xbox store size, Rockstar Support preload article | **Likely early Nov** (preload opens 12 Nov) |

---

### Sources (fetched 23 Sep 2026)
Home pages, robots.txt and sitemaps of: leonidahub.net, gta6times.com, www.gta6post.com, vicecitymethods.com, gtaviinsider.com, gtaintel.com, leonidaverse.com, gta6bible.com, grandtheft.gg. Pages: gta6times.com/news/twitch-ceo-expects-gta-6-online-2027, /gta-6/music, /gta-6/file-size, /gta-6/release-date/canada, /tools; vicecitymethods.com/news/{youre-going-take-hit-rainbow-six, gta-6-soundtrack-travis-scott-other, gta-6-launches-no-fun-modding, gta-6-dualsense-controllers-price-availability}, /tools; gtaviinsider.com/{gta-6-songs-list, gta-6-file-size, gta-6-gas-station-diesel-cost, gta-6-nightlife-explained}; gtaintel.com/news/gta-6-miami-beach-vote-beach-chair-deal, /games/gta-6/weapons/grenade-launcher; gta6bible.com/every-song-featured-in-gta-6s-26-minute-extended-look/; grandtheft.gg/radio/, /how-much-gta-6-cost-price/; www.gta6post.com/gta-6-price/canada/, /gta-6-timeline/; leonidahub.net/guides, /guides/launch-day, /guides/100-completion-checklist; gtaboom.com/the-complete-gta-6-soundtrack-tracker-updated-live-20ed. gta6central.gg and leonidawire.com could not be fetched (NXDOMAIN and 503); their notes come from WebSearch `site:` results.
