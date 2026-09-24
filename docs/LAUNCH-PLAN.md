# Launch plan — the 3 days before GTA 6

Written 24 September 2026. Launch: **19 November 2026**, PS5 and Xbox Series X|S.

All times below are **Pakistan time (PKT, UTC+5)**. Unlock times come from
`/gta-6-release-time` (PlayStation Store listings).

| Region unlocks | UTC | PKT |
|---|---|---|
| New Zealand (first) | 18 Nov 11:00 | **18 Nov 16:00** |
| Australia (Sydney) | 18 Nov 13:00 | 18 Nov 18:00 |
| India | 18 Nov 18:30 | 18 Nov 23:30 |
| UAE (most Pakistan accounts) | 18 Nov 20:00 | **19 Nov 01:00** |
| UK | 19 Nov 00:00 | 19 Nov 05:00 |
| US East | 19 Nov 05:00 | **19 Nov 10:00** |
| Mexico City (last) | 19 Nov 06:00 | 19 Nov 11:00 |

The `/gta-6-launch` status box flips by itself at 18 Nov 16:00 PKT
("unlocking now") and 19 Nov 11:00 PKT ("out now").

---

## Before the 3 days (12–15 Nov)

- [ ] **12 Nov, preload opens.** Rockstar or the stores will show the file size.
      Update `/gta-6-file-size`, the launch log and the launch timeline the same day.
- [ ] **Launch trailer.** GTA V's came 19 days before launch, RDR2's 8 days before.
      If it drops, add it to `/gta-6-trailers`, the launch log and the timeline.
- [ ] **Review date.** If Rockstar or outlets announce the embargo, add it to the timeline.
- [ ] **Robot speed.** The robot runs twice a day and the Newswire watcher once a day.
      From 12 to 21 Nov they should run every 2 hours and every hour.
      (Automatic if the launch-window switch is added now. See the bottom.)
- [ ] **AdSense.** If approved, put the 3 slot ids in `ADSENSE_SLOTS`
      (`src/lib/site.mjs`). Launch week is the biggest traffic week of the year.

---

## Day 1 — Monday 16 Nov (3 days before)

**Goal: every launch page is correct and in Google.**

1. Run the health check in `HANDOFF.md` section 13. All pages must return 200.
2. Search Console, **URL Inspection → Request indexing** (by hand) for:
   `/gta-6-launch`, `/gta-6-release-time`, `/gta-6-file-size`, `/gta-6-preload`,
   `/gta-6-price`, `/gta-6-countdown`. About 10 a day allowed.
3. Fact pass on the launch pages. Anything still "not announced":
   check Rockstar Newswire, the PS Store and the Xbox Store again.
   Missing Xbox unlock times are the most likely gap.
4. Pick the **first 20 entity pages to fill after launch** (`data/ingame.json`).
   Use Search Console: the pages with the most impressions go first
   (today: Ganado Retro Build, PTT Youngin$, Devil Woman, Ambrosia,
   Vice City airport, the 55 Vapid Stanier).
5. Check GA4 Realtime works, so you can watch launch night live.

## Day 2 — Tuesday 17 Nov (2 days before)

**Goal: be ready for reviews and the first leaks.**

1. **Reviews may land today or tomorrow.** GTA V reviews came 1 day before
   launch, RDR2 reviews 1 day before launch. Past pattern only.
   When the embargo lifts, add a launch-log entry with the Metacritic or
   OpenCritic score and its link. One sourced line, not a new page.
2. **Early copies and leaks.** Boxed copies have been on sale since 12 Nov, so
   spoilers and footage will spread. Add nothing from leaks. Only official
   sources, the stores, or named major outlets. Rumours go to `/tracker`
   with the "Unverified" label, as now.
3. Re-run the health check. Check `/gta-6-launch` on your phone.

## Day 3 — Wednesday 18 Nov (launch starts at 16:00 PKT)

**Goal: first with the news, never wrong.**

| PKT | Do this |
|---|---|
| Morning | Final fact check. Push any last change **before 14:00** (a deploy takes about 10 minutes). |
| 16:00 | New Zealand unlocks. Check the status box flipped. Add a launch-log line with a source (a store page or a major outlet's report). |
| Evening | Watch GA4 Realtime. Note which pages get traffic. Those pages get fixes first. |
| 19 Nov 01:00 | UAE accounts unlock (most Pakistan players). |
| 19 Nov 05:00 | UK unlocks. |
| 19 Nov 10:00 | US unlocks. Biggest search wave. |

**From the first hours after unlock:** start filling `data/ingame.json` for the
top 20 pages. **Every entry needs a source** (a major outlet's guide, or
Rockstar). One entry = one push = live about 10 minutes later.

---

## Rules for launch week

- Never publish a fact without a source. Being right beats being first.
- One launch-log line per real event. The log is the page's freshness signal.
- Do not build empty "coming soon" pages. Build a page when it has facts.
- Push small and often. Each push deploys in about 10 minutes.
