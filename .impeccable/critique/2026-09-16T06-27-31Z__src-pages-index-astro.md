---
target: the gta6record.com homepage
total_score: 25
max_score: 32
na_heuristics: 5,9
p0_count: 1
p1_count: 1
timestamp: 2026-09-16T06-27-31Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design review, isolated; B: detector plus build evidence, isolated)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No "checked on" date anywhere on the home page. `index.astro` never passes the `updated` prop that `BaseLayout.astro` already supports. |
| 2 | Match System / Real World | 4 | Plain owner voice. "Confirmed by Rockstar", not `OFFICIAL_CONFIRMED`. |
| 3 | User Control and Freedom | 3 | Real search form at every width, no-JS menu. No way back to the top from band 5 on a phone. |
| 4 | Consistency and Standards | 3 | `.directory` prints a verb ("Read") in band 2 and a value ("12 entries") in band 4, same slot, same component. |
| 5 | Error Prevention | n/a | No form with consequences, no destructive action. The only input is a GET search. |
| 6 | Recognition Rather Than Recall | 3 | Four provenance tiers exist. The home page only ever shows one of them, so the scale reads as a badge. |
| 7 | Flexibility and Efficiency | 2 | The nine-hub strip is `display:none` under 760px, so the primary phone user pays one extra tap to reach the catalogue. |
| 8 | Aesthetic and Minimalist Design | 4 | Committed colour at band scale, one icon stroke weight, no decoration without a job. |
| 9 | Error Recovery | n/a | This surface has no error state. |
| 10 | Help and Documentation | 4 | Band 5, "How this site works", states the method and what the site refuses to carry, in the same voice as the facts. |
| **Total** | | **25/32** | **Good, not yet excellent** |

Two heuristics marked n/a and the total renormalised to 32.

## Design Specificity Verdict

**LLM assessment: authored for this product, clearly. But the home page under-uses the world the rest of the site was built for.**

The proof of authorship is structural, not stylistic. `world.css` has no `.card` and no utility soup. It has `.spec`, `.directory` with a dotted leader, `.plaque` with a brass top rule, `.mark` and `.stamp`. Those are the nouns of a records office. `Mark.astro` refuses colour-only encoding, so the provenance tier survives greyscale. `Plate.astro` answers "we own no photographs" with a deterministic terrazzo plate instead of a grey box. A category-interchangeable site would have shipped a neon hero over a card grid. This one refuses both the category rut and the template default, and the CSS proves the refusal.

Five bands, five different forms. Structural sameness is genuinely avoided.

The miss is the product, not the world. The home page presents the catalogue's contents and withholds the catalogue's method. The provenance mark, the single competitive moat, does not appear until band 3, below the fold on every phone. The countdown exists as a built component and is not here. There is no reserved ad or affiliate placement, though PRODUCT.md commits to both being designed for rather than dropped in.

**Deterministic scan:** `detect.mjs --json src/pages/index.astro src/layouts/BaseLayout.astro src/components` exited 0 with an empty findings array. Zero findings. Nothing to dismiss as a false positive.

Build evidence from `dist/index.html` (36,079 bytes, built 2026-09-16 10:22):

- 5 bands: 1 glaze, 2 plaster, 2 plain. Matches DESIGN.md's five-form rule.
- Heading order clean: one `h1`, four `h2`, no skipped levels.
- 5 `img` tags, all with non-empty alt text, all with width, height, decoding and loading set.
- 0 em dashes.
- 0 hardcoded hex colours in inline styles on the page or the layout.
- 2 script tags, 2 self-hosted variable fonts (archivo 90 KB, source-serif-4 122 KB).
- 67 links, all internal, 0 outbound.

**Visual overlays:** not run. No local server was started and no browser injection was attempted, so there is no overlay in a browser tab. The evidence above is the fallback signal.

## Overall Impression

The material is excellent and the argument is buried. This page has the strongest honesty copy on the whole domain sitting in the last band, and the weakest version of its own promise sitting in the first. The single biggest opportunity is to move the proof to the top: put a real provenance mark in the hero, and lift the "sites that carry those lists made them up" paragraph out of the basement.

## What's Working

1. **`Mark.astro` refuses colour-only encoding.** Four drawn paths at one stroke weight, plus a text label. The tier is readable in greyscale, at 14px, to a colour-blind reader, and in print. Most sites ship a green/amber/red pill. The component's constraint is the product's accessibility promise written in code.
2. **`Plate.astro` turns the biggest content deficit into the most distinctive asset.** No publishable photography, and the honest options were a grey box or a stolen screenshot. Instead: a deterministic terrazzo plate, section-coloured, hashed from the slug, so the same entry draws the same plate every build. It makes the grid scannable by type before any text is read, never shifts layout, and upgrades itself the day a real JPEG lands.
3. **A real search field in the masthead at every width, working with JavaScript off.** A plain GET form to `/search`, label visually hidden not removed, `enterkeyhint="search"`, and a prefetch that warms Pagefind on first focus. For a phone-first stranger, search is the highest-value control in the chrome, and it is treated as such.

## Priority Issues

### [P0] The provenance mark is missing from the first screen

**Why it matters:** The `h1` promises "with its source". The spec list under it answers date, platforms, price, then a "Source" row that is a plain link styled like every other link. The one component that separates this site from every rumour mill does not appear until band 3. The sceptic's question, "how do you know", is answered four bands down.

**Fix:** In `src/pages/index.astro` band 1, add `<Mark status="OFFICIAL_CONFIRMED" as="stamp" label="Confirmed by Rockstar" />` above the `<dl class="spec">`, and put a `<Mark>` inside the Source row's `<dd>`. Add a `.band--glaze .stamp` rule in `src/styles/world.css` so it reads on the glaze ground. This spends the site's one authored animation on the page that has to earn the first click.

**Suggested command:** `/impeccable bolder`

### [P1] The best copy on the page is last

**Why it matters:** Doubt hits a GTA visitor in the first 600px of scroll. The answer to it is at 3,000px. "Sites that carry those lists today made them up" is the boldest and most disarming sentence on the domain, and only a reader who already trusts the site will ever reach it.

**Fix:** In `src/pages/index.astro`, lift the first paragraph of the final prose band into band 1 as two short lines under `.btns`. Better still, split it into a compact four-tier provenance legend in a new `.band--plaster` right after the hero. That legend also fixes heuristic 6, because it is the only place a reader can learn the system has four states, not one.

**Suggested command:** `/impeccable clarify`

### [P2] The same nine destinations are offered three times

**Why it matters:** The `.sections` nav strip, band 3's nine tiles and band 4's nine directory rows are the same nine hubs in three costumes. On a phone the strip is hidden, so bands 3 and 4 become a straight duplicate separated by a prose band. 67 links against 9 real sections.

**Fix:** In `src/pages/index.astro`, merge bands 3 and 4. Keep `ul.tiles`, move the entry count onto the tile (add a count line to `EntityTile.astro`'s `.tile__foot` beside the `<Mark>`), and delete the fourth `section.band--plaster`. The page drops to four bands, the dotted leader becomes band 2's signature instead of a repeated motif, and about nine redundant links go.

**Suggested command:** `/impeccable distill`

### [P3] The countdown is built and is not on the home page

**Why it matters:** 19 November 2026 is the fact every visitor already cares about, and the only reason a returning fan reopens the home page instead of a bookmark. `Countdown.astro` already renders a correct integer at build time for crawlers and JS-off readers, and already says plainly that Rockstar never published an hour. The home page leaves the date as inert text in a `<dd>`.

**Fix:** Import `Countdown.astro` into `src/pages/index.astro` band 1 beside the `.spec` list, and link the existing date row to `/gta-6-countdown`. The tick swaps text content, not CSS, so binding rule 3 (one animation in the whole site) still holds.

**Suggested command:** `/impeccable shape`

### [P3] No designed slot for the ads and affiliate cards the product requires

**Why it matters:** PRODUCT.md commits to ad slots and affiliate cards being part of the page, not an afterthought. `Ad.astro` is well built: it renders nothing until both ids exist and reserves height so there is no layout shift. The home page never calls it. The day AdSense approves, the pressure is to drop a unit into whichever gap looks emptiest. The higher-intent buyer, the console and TV shopper, has no surface here at all.

**Fix:** Place `<Ad placement="index" />` in its own `.band` between the showcase band and "How this site works", and add the matching `index` key to `ADSENSE_SLOTS` in `src/lib/site.mjs`.

**Suggested command:** `/impeccable harden`

## Persona Red Flags

**Phone-first first-timer, arriving from "gta 6 release date" and tapping the wordmark.** This is the primary user and the realistic path here. `.sections` is `display:none` under 760px, so the site's structure sits one tap behind a hamburger on the device that carries the traffic. Band 3's lede, "Entries without a picture we may publish carry a terrazzo plate in their section's colour", explains the site's own image fallback to someone who arrived wanting a price. It is the one paragraph written from the builder's point of view.

**The sceptic who wants the source.** The persona the whole product exists for, and the home page serves them worst. The Source row in the `.spec` list is `<a href="/gta-6-release-date">`, styled identically to every other link in the glaze band, with no mark, no tier and no check date. Meanwhile four mark states with four drawn icons sit unused until band 3, where only one of the four is ever shown.

**Returning fan checking for news.** The page carries no date and no delta. `BaseLayout.astro` accepts an `updated` prop and prints "This page was checked ..."; `index.astro` never passes it, so on a site built around check dates the front page is the only page without one. No countdown, nothing that differs between a visit today and a visit in October. The one freshness path is labelled "Every dated announcement", which describes an archive, not an update.

## Minor Observations

- `.mark--community` sets `color: var(--ink-2)`, which the base `.mark` already sets. Confirmed, press and none each get their own ground and border. The third rung of a four-rung ladder is the only one with no material of its own.
- Six inline `style=` attributes in `index.astro`. Four are `margin-top:0` fighting `h2 { margin: 2.4em 0 0.7em }`; one `.band > .shell > h2:first-child` rule in `world.css` deletes all four. `columns:1` deserves a `.directory--single` modifier, because every other structural decision lives in `world.css`.
- `.directory__count` reads "Read" ten times in band 2. A dotted leader exists to align a value against a name. With a verb in the value slot, the leader drags the eye 400px to arrive at no information. A tier or a check date there would earn the rule.
- `.tile__text` truncates at `slice(0, 96)` with no ellipsis, so descriptions end mid-word. Cut at the last space before 96, or use `-webkit-line-clamp`.
- Eight of nine showcase tiles carry the identical CONFIRMED BY ROCKSTAR mark, because the selector prefers `OFFICIAL_CONFIRMED` per type. One press-reported and one community-spotted entry in that grid would teach the whole system in a glance.
- `.colophon { margin-top: 64px }` puts a stone gap under band 5. Every other band abuts. The page trails off rather than closing.
- The `.skip` link is styled inside a `<style is:global>` block in `BaseLayout.astro` with a hardcoded `#20180a`, the one piece of visual styling living outside the token file.
- No horizontal scroll risk found at 400px. Binding rule 7 holds.

## Questions to Consider

1. If the primary user arrives at an answer page and the home page is not the entrance, why is this page built as an entrance? Its real visitor just read an answer and tapped the wordmark to check the source was real. That is a verification surface, not a welcome surface.
2. The thesis is that provenance is the design. Why is the glaze hero, the highest-value space on the site, the only band with no provenance mark on it?
3. Nine sections, nine tiles, nine directory rows, nine nav items. Is nine the shape of the data, or the shape the page inherited from the CSV having nine entity types?
4. The site says out loud that it has no cheats, no missions and no map, and that sites carrying those lists made them up. That is the boldest sentence on the domain, and it is in the last band. In the hero, would it lose the readers who wanted cheats, or gain the ones who are tired of being lied to?
