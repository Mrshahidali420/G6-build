# Data sources for data/extras/ reference files

Written 23 September 2026. `scripts/build-data.mjs` loads the vehicle,
landmark and wildlife files and the entity pages render them. Every entry carries its own `source` {label, url}
and a `basis` label.

Note: `scripts/build-data.mjs` loads `data/extras/<slug>.json` for each entity.
None of the four file names below is an entity slug, so the loader ignores them.

---

## 1. `data/extras/vehicle-real-life.json`

| | |
|---|---|
| What | The real vehicle each GTA VI vehicle is based on, keyed by our vehicle slug |
| Source | GTA Wiki on Fandom, https://gta.fandom.com, read through its MediaWiki API (`api.php?action=query&prop=revisions`, 50 titles per call, about 1 call a second) |
| Licence | CC BY-SA 3.0, the same licence as the outlawdb/Fandom import behind `data/*-fandom.csv` |
| Credit required | "GTA Wiki (Fandom), CC BY-SA", with a link to the wiki page. Each entry's `source.url` is that page. If the text is changed and republished, it stays under CC BY-SA. |
| Fetched | 23 September 2026 (latest revision of each page on that day) |
| basis | `community-identified` (GTA VI-specific wiki text), or `community-identified (series design)` (see second pass below) |
| Matched | **169 of 268** vehicles (89 first pass, 80 second pass) |

How each entry was chosen:

- Our 258 vehicles that have a Fandom `source` URL were fetched. The other 10
  come from Rockstar or press sources and have no wiki page on file.
- An entry was kept only when the wiki says it **for GTA VI**. In practice:
  - the page is a GTA VI-only page (the infobox `games` field lists only VI,
    or the title is "Unnamed GTA VI ..."), and its Influence or Design
    section names a real vehicle; or
  - a page shared across games has a `Grand Theft Auto VI` subsection under
    Influence or Design that names the real vehicle (Intruder, Tulip, Police
    Cruiser, two police liveries), or a sentence about the GTA VI version
    (Maverick: "closer to the Bell 206").
- `based_on` is the wiki's primary model, shortened. Secondary influences
  (a bumper here, a headlight there) are left out.
- Four entries name a **livery** rather than a body (for example "Livery of
  Miami-Dade Police Department Ford F-150s"). The text says so.
- Skipped on purpose: pages that only describe changes from GTA V ("retains
  its previous design"), guesses from a name only (Riata Classic, SERA
  minivan), and single-detail likenesses (a rear light, an interior).
- **145 vehicles sit on series-wide wiki pages** (Banshee, Buffalo STX, 8F
  Drafter and so on). Their Influence text is not split by game, so it is not
  a GTA VI statement and was not used. That is the main reason the count is 89.

Spot check: 10 entries searched on the web on 23 September 2026 (Alvino V1,
Creado, PMP 700, Bison second generation, Tulip, Intruder, Seashark second
generation, 1955 Ford-inspired car, Buick Reatta-inspired convertible, S23).
Nine agreed. S23 found no independent source. Most outside sites copy the
wiki, so these checks are not fully independent.

### Second pass, 23 September 2026 (80 more)

The 169 vehicles without an entry were fetched again (169 have a wiki page,
10 have none). Each new entry carries a `basis_note` that starts with the rule
it passed:

- **Rule a (5)**: the page has a GTA VI section or sentence naming the real
  vehicle (Dodo, Dubsta, Squalo, Zorrusso, and the Gauntlet Interceptor's
  Florida Highway Patrol livery).
- **Rule b (14)**: the design text names the real vehicle and a GTA VI section
  says the GTA VI version keeps that design ("largely unchanged", "slight
  alterations"). Chino, Carbonizzare, Stanier, Primo and others.
- **Rule c (61)**: the Influence text is game-agnostic (no per-game
  subsections), names one primary real vehicle, and the infobox lists GTA VI.
  These get `basis: "community-identified (series design)"` and the page says
  so. It is the series design, not a statement about GTA VI.

Rejected (89): pages whose Influence is split by game with different vehicles
(Buccaneer, Coquette, Regina, Sultan, Police Maverick); pages whose only
influence text sits under a "GTA Online" or "GTA V" heading (Gauntlet Hellfire,
Toros, Landstalker XL, Growler, Penumbra and others); GTA VI redesigns the wiki
does not tie to a vehicle (Blista Compact, Cheetah Classic, Seashark, Rancher);
no single primary vehicle (Emperor, Bison, Nimbus, XLS, Phantom, Tempesta);
name-only guesses (Riata Classic, SERA minivan); and pages that name no real
vehicle (trailers, most "Unnamed GTA VI" pages, custom variants).

Refresh: fetch the wikitext of every vehicle `source` URL from `api.php`,
re-read the Influence/Design section (or its `Grand Theft Auto VI`
subsection), and update `based_on` by hand. Only use a series-wide paragraph
under rule c above, and label it `(series design)`.

---

## 1b. `data/extras/vehicle-real-photos.json` and `public/img/real-cars/`

| | |
|---|---|
| What | One photo of the real vehicle named in a vehicle's `based_on`, keyed by slug: `{file, credit, source}` |
| Source | Wikimedia Commons. Searched through `api.wikimedia.org/core/v1/commons/search/page`, file data from `en.wikipedia.org/w/api.php` (`prop=imageinfo`, `iiprop=extmetadata`). `commons.wikimedia.org` itself does not connect from this PC. |
| Licence | Only CC0, public domain, CC BY or CC BY-SA files. Author and licence come from the file's `extmetadata`. |
| Credit | `credit` reads "Real-world <model> (not a game image). Photo: <author>, <licence>, via Wikimedia Commons." and `source` is the Commons file page. The page shows both under the photo. |
| Files | ~1200 px wide JPEG, quality 82, in `public/img/real-cars/<slug>.jpg` |
| Count | 119 photos (24.3 MB), for 119 of the 169 vehicles with a basis |

Each photo was opened and checked by eye for the right model and generation.
Skipped: liveries, one-off conversions, boats and brands with no clear Commons
photo, entries where the wiki does not name a generation (Ingot), and entries
where no free photo showed the right generation (PMP 700, Dominator GT,
Moonbeam, Walton L35, the Sprinter-based van, the LeBaron wagon and others).

These photos are not game images. They never feed the hero, the entity tiles,
the OG image or `src/lib/images.mjs`; `scripts/build-data.mjs` hangs them off
`realLife.photo` only, and a bad row stops the build. No JSON-LD property is
added for them: an `image` on the game entity would claim the real car is the
game vehicle.

---

## 2. `data/extras/landmark-addresses.json`

| | |
|---|---|
| What | The real-world address and lat/lng of a landmark, location or business, keyed by our slug |
| Source | `rolux/gtadb.org`, file `map/data/6/landmarks.json`, https://github.com/rolux/gtadb.org |
| Commit | `cfa8a994b0250f05e5ac40cf9abbe2186991b999` (committed 22 September 2026) |
| Licence | Data CC BY 4.0 (`LICENSE-DATA`); code MIT |
| Credit required | "gtadb.org and all contributors", with a link to the licence (https://creativecommons.org/licenses/by/4.0/). Their preferred form: "GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org". Say if we changed anything. |
| Fetched | 23 September 2026 |
| basis | `community-identified` for every entry |
| Matched | **61** (53 landmarks, 7 businesses, 1 location) |

Dataset size at that commit: 2,819 landmarks, 816 with a real name (not
starting with "?"), 1,674 with a real address.

How each entry was chosen:

- Names starting with "?" were skipped.
- Match rule: the gtadb name (the part before the first comma) equals our
  `name` or an `altNames` entry after lower-casing, removing accents,
  apostrophes, full stops and a leading "The".
- Five more were accepted where the only difference is a generic word:
  Boardwalk Hotel, Cordelia Hotel, Seahorse Hotel, Megamundo Building, Easy
  Inn (gtadb: "Easy Inn Motel").
- Left out even though the name matched: chain or multi-branch businesses
  (Lucky Plucker, Vinylism, Gas Stop, Bobby Hurricane's, Jack of Hearts),
  "Vice City Sign" (gtadb gives a fictitious address), "Atlantic Ocean", Mount
  Kalaga National Park (gtadb's entry is the mountain, not the park), and 10
  matches with no real address in gtadb.
- Eight names match more than one gtadb landmark (Lombank, Bite, ShoreFront,
  Schlott Construction, Car Wash, The Marina, Wonder Whale, Y Vice City). Not
  included.
- About 50 fuzzy candidates (Beacon Theater, Archez, Pawn & Gun, Delights
  Cabaret and others) were listed for review and not included.
- `source.url` opens that landmark on the map: `https://map.gtadb.org/#VI,<id>`.
- Each entry also carries `gtadb_name` (their full in-game name string) so a
  reviewer can see what was matched.

Refresh: `git clone --filter=blob:none --sparse
https://github.com/rolux/gtadb.org.git`, then `git sparse-checkout set
map/data/6`, then `git pull` later. The gtadb readme asks people not to fetch
live data from the site. Each record is `[id, [name, igCoords, ?, realAddress,
[lat, lng], ?, tags, color, timestamps]]`. Re-run the name match and record the
new commit hash here.

---

## 3. `data/extras/gtadb-real-cities.json`

| | |
|---|---|
| What | Count of gtadb GTA VI landmarks per real city, top 30, for later per-city hubs |
| Source, commit, licence, credit | Same as file 2 |
| Method | City and state taken from every gtadb landmark with a real address (named or not). Plus-codes removed. 1,626 of 1,674 addresses could be read. |

Top five: Miami FL 617, Miami Beach FL 440, Panama City FL 53, Homestead FL
50, Cedar Key FL 42. Some gtadb "cities" are neighbourhoods Google treats as
towns (Coconut Grove, Naval Air Station Key West). Check them before building
a hub.

---

## 4. `data/extras/wildlife-species.json`

| | |
|---|---|
| What | The real species for a wildlife entity whose name points to one species |
| Source | GBIF species API, `https://api.gbif.org/v1/species/match?name=...`; each `source.url` is the GBIF species page |
| Licence | GBIF Backbone Taxonomy, CC BY 4.0 |
| Credit required | "GBIF Backbone Taxonomy, CC BY 4.0" with a link to the species page. Full citation: GBIF Secretariat, GBIF Backbone Taxonomy, https://doi.org/10.15468/39omei |
| Fetched | 23 September 2026 |
| basis | `name-mapped` (our entity name was mapped to one species; the game does not name species) |
| Matched | **7 of 18** |

Included: Alligators, Cats, Cougars, Dogs, Double-Crested Cormorant,
Flamingos (the American flamingo is the only flamingo wild in Florida),
Raccoons. GBIF's accepted name for the cormorant is *Phalacrocorax auritus*;
the newer *Nannopterum auritum* is kept in `also_known_as`.

Skipped because the name covers more than one Florida species: Dolphins,
Ducks, Eels, Fish, Foxes, Iguanas, Sea Turtles, Seagulls, Sharks, Snakes,
Squirrels.

Refresh: call the GBIF match API for each scientific name, follow
`acceptedUsageKey` if the name has become a synonym, and update `gbif_key`.
