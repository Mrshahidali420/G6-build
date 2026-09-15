# GTA 6 site — page plan v1

Built from 110 verified entity rows in `data/` plus the keyword harvest themes.
Rule applied throughout: **one page = one primary keyword.** Name variants
(gta 6 / gta6 / gta vi / grand theft auto 6) are the SAME page, handled with
alt-name text on the page, never a separate page.

Two build waves:
- **WAVE 1 — build now.** Official material answers it today. This is the head start.
- **WAVE 2 — build on launch night, 19 Nov 2026.** Only the released game answers it.

No countdown page. Six domains already own that query.

---

## GROUP A — Answer pages (WAVE 1, the traffic engine)

These carry the volume. Each one is a single question with a single answer.

| # | Page | Primary keyword | Intent | Words |
|---|---|---|---|---|
| 1 | GTA 6 release date | gta 6 release date | Informational | 900 |
| 2 | GTA 6 price in every country | gta 6 price | Commercial | 1400 |
| 3 | GTA 6 price in India | gta 6 price in india | Commercial | 900 |
| 4 | Standard vs Ultimate Edition | gta 6 ultimate edition | Commercial | 1200 |
| 5 | GTA 6 pre-order guide | gta 6 pre order | Transactional | 1000 |
| 6 | GTA 6 preload and install | gta 6 preload | Informational | 700 |
| 7 | What consoles GTA 6 is on | gta 6 platforms | Informational | 700 |
| 8 | Will GTA 6 come to PC | will gta 6 be on pc | Informational | 900 |
| 9 | Every GTA 6 delay explained | gta 6 delayed | Informational | 900 |
| 10 | GTA 6 age rating | gta 6 age rating | Informational | 600 |
| 11 | GTA 6 file size | gta 6 file size | Informational | 600 |
| 12 | GTA 6 map size and Leonida | gta 6 map size | Informational | 1100 |
| 13 | Every song in the GTA 6 trailers | gta 6 trailer song | Informational | 1200 |
| 14 | GTA 6 vs GTA 5 | gta 6 vs gta 5 | Informational | 1400 |
| 15 | Is GTA 6 open world Vice City | gta 6 vice city | Informational | 800 |
| 16 | GTA Online after GTA 6 | gta 6 online | Informational | 800 |

**16 pages.**

Pages 10 and 11 have NO confirmed answer today. They are still built now, saying
plainly that no rating and no file size are published yet, and are updated the day
they are. Ranking early on an unanswered question is the point.

---

## GROUP B — Hub pages (WAVE 1)

One per entity type. Each links to every child page. Each child links back.

| # | Page | Primary keyword | Intent | Words |
|---|---|---|---|---|
| 17 | All GTA 6 characters | gta 6 characters | Informational | 900 |
| 18 | All GTA 6 vehicles | gta 6 cars | Informational | 900 |
| 19 | GTA 6 map and locations | gta 6 locations | Informational | 900 |
| 20 | GTA 6 soundtrack | gta 6 soundtrack | Informational | 900 |
| 21 | GTA 6 shops and businesses | gta 6 businesses | Informational | 700 |
| 22 | GTA 6 brands and manufacturers | gta 6 brands | Informational | 700 |
| 23 | GTA 6 gameplay features | gta 6 gameplay | Informational | 1000 |
| 24 | GTA 6 editions | gta 6 editions | Commercial | 700 |

**8 pages.**

---

## GROUP C — Entity pages (WAVE 1, one per verified row)

One page per row already on disk. Every page states its source and its confidence
level in plain words. Nothing is claimed that the data file does not support.

| Type | Source file | Pages | Words each |
|---|---|---|---|
| Song | song-radio-claude.csv | 19 | 450 |
| Landmark | landmark-brand-claude.csv | 17 | 500 |
| Gameplay feature | gameplay_feature-claude.csv | 13 | 550 |
| Character | character-chatgpt.csv | 11 | 600 |
| Brand | landmark-brand-claude.csv | 10 | 450 |
| Vehicle | vehicle-chatgpt.csv | 8 | 500 |
| Business | business-claude.csv | 8 | 450 |
| Location / region | location-chatgpt.csv | 7 | 600 |

**93 pages.**

Note: the 14 `release_fact` rows are NOT entity pages. They are the evidence
behind Group A. The 3 `edition` rows feed page 4 and page 24.

---

## GROUP D — Shopping pages (WAVE 1, Amazon money)

These do not need a console and do not need the game to exist. They are the only
pages on the site with a real buying decision in them.

| # | Page | Primary keyword | Intent | Words |
|---|---|---|---|---|
| 118 | Which PS5 to buy for GTA 6 | best ps5 for gta 6 | Commercial | 1600 |
| 119 | Xbox Series X vs S for GTA 6 | xbox series x or s gta 6 | Commercial | 1400 |
| 120 | Best controller for GTA 6 | best controller for gta 6 | Commercial | 1300 |
| 121 | Best headset for GTA 6 | best headset for gta 6 | Commercial | 1300 |
| 122 | Best TV for GTA 6 | best tv for gta 6 | Commercial | 1400 |
| 123 | Storage and SSD for GTA 6 | ps5 ssd for gta 6 | Commercial | 1200 |
| 124 | GTA 6 merch and gifts | gta 6 merch | Commercial | 900 |

**7 pages.**

---

## GROUP E — Home and utility

| # | Page | Purpose | Words |
|---|---|---|---|
| 125 | Home | Brand plus links to all 8 hubs and the top 6 answer pages | 700 |
| 126 | News index | One post per Rockstar announcement, dated | rolling |
| 127 | About and sources | How the data is verified. Needed for AdSense trust. | 500 |
| 128 | Contact | AdSense requirement | 200 |
| 129 | Privacy policy | AdSense requirement | 900 |

**5 pages.**

---

## TOTAL WAVE 1: 129 pages

Roughly 68,000 words. That is the whole site before launch day.

---

## WAVE 2 — launch night, 19 Nov 2026

Not built now. Listed so nothing is forgotten.

Missions list, mission walkthroughs, cheats, weapons list, full vehicle list,
radio station list, full song list, collectibles, Easter eggs, trophies and
achievements, money guide, endings, map of every location, best car, how to
unlock X, multiplayer guides.

Each of these is a hub plus many children. Expect 200 to 400 more pages.
The data for them does not exist until the game ships.

---

## Internal linking rule

- Every entity page links UP to its hub and SIDEWAYS to at least 2 sibling
  entities, taken from its own `related_entities` column.
- Every hub links DOWN to all children and ACROSS to at least 2 answer pages.
- Every answer page links to at least 2 entity pages that prove its facts.

No page is an orphan. Minimum 3 internal links per page.

---

## The thing no competitor does

Every page carries Schema.org JSON-LD built from the CSV columns:
`VideoGame`, `Person`, `Place`, `MusicRecording`, `Product`, `Offer`, `FAQPage`.
The 21-column schema was designed for this. No GTA site in the niche does it.

---

## Open items before build

1. The keyword CSV was never saved to disk. Save it as
   `data/keywords-chatgpt.csv` so the plan can be checked against real volume.
2. The India price needs verifying on the real PlayStation India store.
3. Four brands (Sprunk, eCola, Burger Shot, Ammu-Nation) are GTA 5 carryovers
   marked confirmed. Verify before publishing those 4 pages.
4. Domain name not chosen.
5. Amazon Associates commission rates not yet checked.
