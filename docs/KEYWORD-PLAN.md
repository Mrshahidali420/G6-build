# Keyword plan — gta6record.com

Written 23 September 2026. Data: Search Console, 17–22 Sep 2026 (the site is
about one week old in Google). The game launches **19 November 2026**, 57 days
from today.

---

## 1. What Search Console says

| Number | Value |
|---|---|
| Clicks | 8 |
| Impressions | 789 |
| Average position | 8.8 |
| First impression | 17 Sep 2026 |

This is a normal first week. It is not a failure. Google is still testing the
site.

**What already works:** long, exact names. The site is in the top 10 for:

- `ptt youngin$ compound` (5.3) · `ptt youngins compound` (4.5)
- `ganado retro build` (4.8, 19 impressions) · `vapid ganado retro build` (3)
- `devil woman gta6` (4.8) · `se me nota gta` (6.3) · `megamundo gta 6` (6.5)
- `stockyard gta 6` (3) · `gta 6 release postponed` (3)
- `/brands` (6.3, 3 clicks) · `/real-places` (8.0, **11.8 % CTR**)

**What does not work:** short, big words. The site is on page 5–7 for:

- `gta 6 locations` (65) · `gta 6 location` (67) · `gta 6 map` (not seen)
- `where does gta 6 take place` (52) · `gta 6 soundtrack` (54)
- `gta 6 platforms` (76) · `gta 6 consoles` (52) · `gta vi editions` (67)

**The logic:** a one-week-old site cannot beat IGN, GTA Wiki and Rockstar on a
short word. It CAN win the long, exact name nobody else writes a page for. The
site has 750 of those names. That is the moat.

**Index check (22 Sep 2026, sample of 60 of 3,333 sitemap URLs):**
24 indexed, 33 "Discovered – not indexed", 3 "unknown to Google".
So roughly **4 in 10 pages are in Google**. The `/businesses` hub page itself
is not indexed yet. The sample is alphabetical (brands, businesses, `best-*`),
so it is a rough guide, not a full count.

Logic: Google has found the pages, but it crawls a new domain slowly. 3,333
pages is a lot for a one-week-old site. Nothing is blocked. The cure is time,
strong internal links to the hub pages, and a manual index request for the
hub pages first (about 10 a day).

---

## 2. Problems found

| # | Problem | Proof | Fix |
|---|---|---|---|
| 1 | `www.gta6record.com` answers 200, not 301. | 8 `www.` pages got impressions in GSC. Google splits the signal across two hosts. | Cloudflare Redirect Rule: `www` → apex, 301. Free. |
| 2 | Two pages fight for one word, with no link between them. | `/gta-6-ultimate-edition` (pos 8.6) vs `/editions/gta-6-ultimate-edition` (pos 50). Same for `/gta-6-vice-city` vs `/locations/vice-city`. | Link each pair both ways. The answer page is the main one for the question. |
| 3 | Question queries land on pages that do not answer them first. | `what is ambrosia based on gta 6`, `what is sprunk`, `what is megamundo`, `will gta 6 ultimate edition include online`. | Put a one-line answer to that exact question at the top, and in the meta description. |
| 4 | Title does not say the word people type. | `/gta-6-platforms` has 85 impressions, 0 clicks. People ask "is GTA 6 on PC". | Title: `Is GTA 6 on PC? Every confirmed platform`. |

---

## 3. Keyword map by logic

The rule for each group: **what will a person type, and when?**

### A. Now → launch day (Sep–Nov 2026). Build now.

| Keyword group | Why it will grow | Page |
|---|---|---|
| `gta 6 release time [country]`, `gta 6 unlock time`, `what time does gta 6 come out` | Every launch has a huge spike for this on the day before. Low competition per country. | New: `/gta-6-release-time` + one section per time zone. Say "not announced" until Rockstar says. |
| `gta 6 price [currency]` — CAD, GBP, EUR, AUD, PKR, INR | Seen already: `how much is gta 6 pre order cad`, `gta 6 total cost in indian rupees`. Only India has a page. | New: price pages per country, from the official store price. Amazon tag per country fits here. |
| `is gta 6 on pc`, `gta 6 ps4`, `gta 6 switch 2`, `gta 6 xbox one` | Seen: `gta 6 on nintendo switch`, `gra6 platforms`. One question per console. | Sections on `/gta-6-platforms`, each with its own H2. |
| `gta 6 ultimate edition worth it`, `what do you get` | Seen 4 times in one week. | `/gta-6-ultimate-edition`: add a "Should you buy it" block. |
| `gta 6 preload`, `gta 6 file size` | Pages exist. Demand peaks 1–7 days before launch. | Keep fresh. Update the date line when Rockstar posts the number. |

### B. Launch day onward (19 Nov 2026+). Prepare the pages now, fill with facts after.

This is the big one. After launch, searches change from **"what is"** to
**"where is"** and **"how do I"**.

| Keyword group | The site already has the page | What to add after launch |
|---|---|---|
| `[car] gta 6 location`, `how to get [car] gta 6` | 268 vehicle pages | Where it spawns, price, class |
| `[business] gta 6 location`, `can you buy [business]` | 180 business pages | Map pin, buyable yes/no |
| `[song] gta 6 radio station` | 19 song pages | Station name |
| `gta 6 cheats`, `gta 6 cheat codes ps5` | `/gta-6-cheats` | Codes the day players find them |
| `gta 6 money glitch`, `how to make money gta 6` | none | New page after launch |
| `gta 6 map full`, `gta 6 map size` | `/map`, `/gta-6-map-size` | Full map from the game |

Do not write any of this before the game is out. Hard rule: no invented facts.
Build the empty slot in the page template now, so it fills in one edit later.

### C. Real place ↔ game place. Best CTR on the site.

`/real-places` has the best CTR (11.8 %). People search the real place:

- `is lakeland in gta 6`, `what is ambrosia based on`, `vice city airport location`
- `12522 fl-24, cedar key` (a real address)

Logic: one short page per real Florida place people ask about — `is [real
place] in GTA 6` — each linked to its game place. Only for places with a
sourced link.

### D. Other languages. Free traffic.

Spanish queries already hit the site: `gta 6 plataforma`, `revólveres hawk &
little morgan`, `se me nota agarrame`. Leave this for later. Note only.

---

## 4. Order of work

1. **Week 1:** www 301 · link the page pairs · fix the 4 titles and the
   question answers · resubmit the sitemap · request indexing for the 11
   hub pages and the top answer pages (about 10 a day).
2. **Week 2–4:** release-time page · price-per-country pages · PC/console
   sections.
3. **Before 19 Nov:** empty "after launch" slots in the vehicle, business and
   song templates.
4. **19 Nov onward:** fill the slots each day as facts appear. This is when the
   traffic comes.
