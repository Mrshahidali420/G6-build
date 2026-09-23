# Competitor plan — gta6record.com

Written 23 September 2026. Built from four research files in this folder:
`serp-census-2026-09-23.md`, `competitors-databases.md`,
`competitors-maps-tools.md`, `competitors-news-hubs.md`.

---

## 1. Who we are up against (GTA 6-only sites)

| Type | Strongest sites | Their weak spot |
|---|---|---|
| Database / wiki | gta6bible.com, tracker.gg/gta6, gta6database.com, wikigta6.com, sixwiki, gtabase.com (all GTA games) | No sources. GTA V stats and 2022 leaks shown as GTA 6 facts. 150–340 word pages. Two stopped updating in July/August. |
| Map / tool | stateofleonida, gtavimap.com, gta6map.io, exploregta6.com, gtatracker.gg | Maps are JS apps. 9–79 crawlable words. `?marker=` URLs with no H1. Invented missions and coordinates. |
| News / hub | gtaboom.com (soundtrack), gta6times.com, gtaviinsider.com, vicecitymethods.com, gta6post.com | AI template posts with no sources. Fake schema dates. One long page, no per-item pages. |

Note: the SERP census used a non-Google search engine. gta6record.com did
not show there at all, but Google Search Console shows it top 10 on long names.
That points to a **Bing / other-engine indexing gap** (see job 1).

---

## 2. What we do next — in order

### Now, no new data needed

| # | Job | Copied from / beats | Why |
|---|---|---|---|
| 1 | **Ping IndexNow on every deploy.** The key file `public/9ce5adc7d2b0607db3a4e84d14e85185.txt` exists but nothing ever calls IndexNow. | beats all | Bing, Yandex, Seznam, Naver pick up new pages in hours. Bing also feeds ChatGPT search and DuckDuckGo. |
| 2 | **Evidence label on every song, tracker row and entity** ("Official", "Seen in trailer", "Reported, unverified"). | gtaboom | This is why gtaboom owns "gta 6 songs". We already store the tier; show it as a clear label at the top. |
| 3 | **"Seen in Trailer 2 at 1:42" on entity pages**, and a shot-by-shot page per trailer. Built from our own `trailers.json` + `camera-shots.json`. | tracker.gg | Nobody else ties shots to entity pages. Adds unique text to thin pages. |
| 4 | **Song timing table**: song, artist, timestamp, scene, for the Extended Look songs. | gtaviinsider | Checkable against Rockstar's video. Wins "gta 6 [song]" queries. |
| 5 | **"Mentioned in" block**: each entity page lists the news / newswire / tracker posts that name it. | gtaintel | More internal links, which helps our 40 % indexing rate. |
| 6 | **Hub counts and filters**: "268 vehicles · 6 confirmed", filter by maker, class, edition, status. | gta6database | Clear, honest, and a reason to stay on the page. |
| 7 | **Update log + "Quick answer" line** on answer pages. | gta6times | Freshness signal, and a direct snippet answer. |
| 8 | **Embeds page**: a free countdown widget other sites can paste, linking back to us. | gtatracker.gg | Free backlinks before launch. |

### Needs outside data (you search, I build)

| # | Idea | Dataset | Search for | Usable before launch |
|---|---|---|---|---|
| A | **Real-life car on every vehicle page.** Every rival has it. We have 0 of 268. | GTA Fandom wiki "based on" field (CC BY-SA, same licence as our current import) | Fandom API; GitHub `gta vehicles real life inspiration json` | Yes, labelled "community-identified" |
| B | **Real address for landmarks; grow /real-places from 11 places to one hub per real city.** | `rolux/gtadb.org` → `map/data/6/landmarks.json`. 2,819 landmarks, 1,662 real addresses. **CC BY 4.0** (credit "gtadb.org and all contributors"). Only ~800 have sure names. | GitHub `rolux/gtadb.org` | Yes |
| C | **Map tiles** under our map dots. | Same repo, `maps/tiles/6`, CC BY 4.0 | as above | Yes. First check that its coordinates match ours. |
| D | **Wildlife real species names** | GBIF / iNaturalist Florida checklists | `gbif florida species checklist` | Yes |
| E | **GTA V stats as a "In GTA V" side box** (not GTA 6 facts) | `DurtyFree/gta-v-data-dumps` (vehicles, weapons, radio). No licence file: use facts, do not republish the file. | GitHub `gta v data dumps` | Yes, clearly labelled GTA V |
| F | **Voice cast** | Wikidata P161 for Grand Theft Auto VI, press reports | Wikidata query | Partly |
| G | **Radio stations / full tracklist** | Rockstar, official Spotify "Grand Theft Auto VI" playlists, MusicBrainz | `gta vi soundtrack json` | Mostly at launch |
| H | **Collectibles, spawn places, prices** | Nothing exists yet | after 19 Nov: `gta 6 collectibles json`, `leonida geojson` | No — fills `data/ingame.json` after launch |

### Do not copy

- **Noindex "coming soon" pages** (gtatracker does this). It breaks our rule of
  no new noindex pages. Build post-launch pages only when they have facts.
- **800 thin landmark pages from gtadb.** Google indexes only 40 % of our pages
  now. More thin pages would make that worse. Use the data to enrich the 120
  landmark pages and the real-city hubs instead.
- **Real-life photo pairs.** The photos may be Google Street View, which cannot
  be reused.
- **GitHub "gta 6 vehicles" repos.** Most are fake "mod menu" repos that look
  like malware. Do not clone them.
